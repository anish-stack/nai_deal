import React, { useEffect, useState } from 'react';
import { Package, Mail, Phone, MapPin, LogOut, Crown, EllipsisVertical, Trash } from 'lucide-react';
import EditProfile from './EditProfile';
import toast from 'react-hot-toast';
import axios from 'axios'
import useAddress from './useAddress';
import { fetchShopDetails, updateShopAddress } from '../api/AddressApi';
import { useGeolocated } from 'react-geolocated';
import AddressForm from './AddressForm';
const ShopProfile = ({ shopDetails, onUpgradePackage, onLogout, onProfileUpload, setProfile, onDeleteAccount }) => {
    const [loading, setLoading] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [edit, setEdit] = useState(false);
    const [bussinessHours, setBussinessHours] = useState(false);
    const [address, setAddress] = useState(false);
    const [planDetail, setPlanDetail] = useState(null)
    const [remainingTime, setRemainingTime] = useState("");
    const [formData, sedFormData] = useState({
        BussinessHours: {
            openTime: '',
            closeTime: '',
            offDay: ''
        }
    });

    console.log("object", shopDetails)
    const [shopData, setShopData] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false); // State to manage the delete modal visibility
    const [deleteReason, setDeleteReason] = useState(''); // State to manage the delete reason

    const { coords, isGeolocationAvailable, isGeolocationEnabled } = useGeolocated({
        positionOptions: { enableHighAccuracy: false },
        userDecisionTimeout: 5000,
    });

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const { data } = await axios.get(`https://api.naideal.com/api/v1/admin-packages`);
                // console.log("data", data.packages);
                const allPlans = data.packages;
                const planInfo = allPlans.find(plan => plan.packageName === shopDetails?.ListingPlan);

                if (planInfo) {
                    setPlanDetail(planInfo);
                    calculateRemainingTime(planInfo.updatedAt, planInfo.validity);
                }
            } catch (error) {
                console.log("Internal server error", error);
            }
        };

        const calculateRemainingTime = (updatedAt, validity) => {
            const updatedDate = new Date(updatedAt);
            const expiryDate = new Date(updatedDate);
            expiryDate.setDate(updatedDate.getDate() + validity);

            const now = new Date();
            const timeDiff = expiryDate - now; // Difference in milliseconds

            if (timeDiff > 0) {
                const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

                setRemainingTime(`${days} days, ${hours} hours, ${minutes} minutes left`);
            } else {
                setRemainingTime("Expired");
            }
        };

        fetchPlans();
    }, [shopDetails]);

    const handleUpdateShowNumber = async (id, showNumber) => {
        const updatedStatus = !showNumber
        try {
            const res = await axios.put(`https://api.naideal.com/api/v1/update_show_detail/${id}`, {
                showNumber: updatedStatus
            })
            toast.success('Status Updated')
            window.location.reload();
        } catch (error) {
            console.log("Internal server error", error)
        }
    }

    const handleUpdateShowEmail = async (id, showEmail) => {
        const updatedStatus = !showEmail
        try {
            const res = await axios.put(`https://api.naideal.com/api/v1/update_show_Email/${id}`, {
                showEmail: updatedStatus
            })
            toast.success('Status Updated')
            window.location.reload();
        } catch (error) {
            console.log("Internal server error", error)
        }
    }

    const {
        addressData,
        handleAddressChange,
        handleGeoCode,
        fetchCurrentLocation
    } = useAddress(shopDetails, coords);

    useEffect(() => {
        if (!shopDetails?.BussinessHours) {
            toast.error('Please add bussiness hours first');
        }
    }, [shopDetails])

    const handleAddressSubmit = async (e) => {
        e.preventDefault();

        if (!addressData.LandMarkCoordinates) {
            toast.error('Please get landmark location first');
            return;
        }

        try {
            const response = await updateShopAddress(
                shopDetails._id,
                addressData,
                coords,
                localStorage.getItem('ShopToken')
            );

            if (response.success) {
                toast.success('Address updated successfully');
                setAddress(false);

                const updatedShop = await fetchShopDetails(shopDetails._id);
                if (updatedShop.success) {
                    setShopData(updatedShop.data);
                }
            }
        } catch (error) {
            console.log("Internal server error", error)
            // toast.error(error.response?.data?.message || 'Error updating address');
        }
    };

    const handleProfileChange = (event) => {
        setProfile(event.target.files[0]);
    };
    useEffect(() => {
        if (shopDetails?.BussinessHours) {

            sedFormData({
                BussinessHours: {
                    openTime: shopDetails.BussinessHours.openTime || '',
                    closeTime: shopDetails.BussinessHours.closeTime || '',
                    offDay: shopDetails.BussinessHours.offDay || ''
                }
            })
        }
    }, [shopDetails?.BussinessHours])

    const handleShareProfile = async (username) => {
        if (!username) return alert("Username is required!");

        const profileUrl = `https://naideal.com/${username}`;
        const message = `Check out my profile on NaiDeal: ${profileUrl}`;

        // Encode the message for WhatsApp URL
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

        // Open WhatsApp share link
        window.open(whatsappUrl, "_blank");
    };


    const OnClose = () => {
        setEdit(false);
    };
    const offDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', "All Day Open"];

    const handleBussinessHours = async (e) => {
        e.preventDefault();

        try {
            const { data } = await axios.post('https://api.naideal.com/api/v1/Other/add-bussiness-hours', formData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('ShopToken')}`,
                },
            })
            console.log(data)
            toast.success('Bussiness Hours Updated Successfully')
            setBussinessHours(false);
        } catch (error) {
            console.log(error)
        }

    }
    const handleChange = (e) => {
        const { name, value } = e.target;
        sedFormData((prev) => ({
            ...prev,
            BussinessHours: {
                ...prev.BussinessHours,
                [name]: value,
            },
        }));
    };

    useEffect(() => {
        if (coords) {
            fetchCurrentLocation();
        }
    }, [coords]);


    const handleUploadClick = () => {
        setLoading(true);
        onProfileUpload().finally(() => {
            setLoading(false);
        });
    };

    const handleDeleteAccount = () => {
        // Call the parent function to handle account deletion
        onDeleteAccount(deleteReason);
        setShowDeleteModal(false); // Close the modal after deletion
    };

    return (
        <>
            <div className="bg-white shadow rounded-lg p-6 transform hover:scale-[1.01] transition-all relative">
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-all duration-300"
                    >
                        <i className="fa-solid w-5 h-5 fa-ellipsis-vertical"></i>

                    </button>
                    {menuOpen && (
                        <div className="absolute z-[999] left-0 mt-2 w-48 bg-white shadow-lg rounded-lg text-sm text-gray-700">
                            <button
                                onClick={() => setEdit(!edit)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-200"
                            >
                                Edit Profile
                            </button>
                            <button
                                onClick={() => setAddress(!address)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-200"
                            >
                                Update Address
                            </button>
                            <button
                                onClick={() => setBussinessHours(!bussinessHours)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-200"
                            >
                                Bussiness Hours
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)} // Show delete confirmation modal
                                className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-200"
                            >
                                Delete Profile
                            </button>
                            <button
                                onClick={onLogout}
                                className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-200"
                            >
                                Logout
                            </button>
                        </div>
                    )}

                </div>
                <div className="flex flex-col items-center">
                    <div className="relative">
                        <img
                            src={shopDetails?.ProfilePic || `https://source.unsplash.com/400x400/?shop,store&random=${Math.random()}`}
                            className="w-32 h-32 rounded-full object-cover mb-4 ring-4 ring-blue-100"
                            alt="Shop Profile"
                        />
                        <span className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs px-2 py-1 rounded-full">
                            {shopDetails?.ListingPlan || 'Basic'}
                        </span>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-800">{shopDetails?.ShopName || "My Shop"}</h1>
                    <p className="text-gray-600 mb-4">{shopDetails?.ShopCategory?.CategoriesName || "General"}</p>

                    <div className="w-full space-y-3">
                        <div className="flex items-center text-gray-700">
                            <Package className="w-5 h-5 mr-2" />
                            <span>Package: {shopDetails?.ListingPlan || "Basic"}</span>
                        </div>
                        <div className="flex items-center text-gray-700">
                            <Package className="w-5 h-5 mr-2" />
                            <span>Package expired in: {remainingTime}</span>
                        </div>
                        <div className="flex items-center text-gray-700">
                            <Mail className="w-5 h-5 mr-2" />
                            <span>{shopDetails?.Email || "email@example.com"}</span>
                        </div>
                        <div className="flex items-center text-gray-700">
                            <Phone className="w-5 h-5 mr-2" />
                            <span>{shopDetails?.ContactNumber
                                ? `${shopDetails.ContactNumber.slice(0, 2)}******${shopDetails.ContactNumber.slice(-2)}`
                                : ""}</span>

                        </div>
                        <div className="flex items-center text-gray-700">
                            <MapPin className="w-5 h-5 mr-2" />
                            <span className="truncate">
                                {shopDetails?.ShopAddress?.ShopAddressStreet || "Address not set"}
                            </span>
                        </div>
                    </div>

                    <div className="mt-6 w-full space-y-3">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleProfileChange}
                            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-white file:bg-blue-500 file:hover:bg-blue-600"
                        />
                        <button
                            onClick={handleUploadClick}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2 px-4 rounded-lg transition-all duration-300"
                            disabled={loading}
                        >
                            {loading ? (
                                <span>Uploading...</span>
                            ) : (
                                <span>Upload Profile Image</span>
                            )}
                        </button>

                        <button
                            onClick={onUpgradePackage}
                            className="w-full flex whitespace-nowrap items-center justify-center gap-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white py-3 px-5 rounded-lg shadow-md transform hover:scale-105 transition-all duration-300 ease-in-out"
                        >
                            <Crown className="w-6 h-6" />
                            <span className="text-lg font-semibold">Upgrade Your Package</span>
                        </button>

                        <button
                            onClick={() => { handleShareProfile(shopDetails?.UserName) }}
                            className="flex items-center w-full justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-all duration-300"
                        >
                            <i className="fa-solid fa-share w-5 h-5"></i>
                            <span>Share Profile</span>
                        </button>
                        <button
                            onClick={() => handleUpdateShowNumber(shopDetails?._id, shopDetails?.showNumber)}
                            className={`w-full flex items-center justify-center gap-2 ${shopDetails?.showNumber ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                                } text-white py-2 px-4 rounded-lg transition-all duration-300`}
                        >
                            {shopDetails?.showNumber ? 'Hide Number' : 'Show Number'}
                        </button>
                        <button
                            onClick={() => handleUpdateShowEmail(shopDetails?._id, shopDetails?.showEmail)}
                            className={`w-full flex items-center justify-center gap-2 ${shopDetails?.showEmail ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                                } text-white py-2 px-4 rounded-lg transition-all duration-300`}
                        >
                            {shopDetails?.showEmail ? 'Hide Email' : 'Show Email'}
                        </button>

                    </div>
                </div>
            </div>

            {edit && (
                <EditProfile profile={shopDetails} isOpen={edit} OnClose={OnClose} />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                        <div className="text-center">
                            <Trash className="w-10 h-10 text-red-600 mx-auto mb-4" />
                            <h2 className="text-2xl font-semibold text-gray-800">Are you sure you want to delete your profile?</h2>
                            <p className="text-gray-600 mt-2">You will lose all your leads and customers. This action is irreversible.</p>
                            <textarea
                                className="w-full mt-4 p-2 border rounded-lg"
                                placeholder="Tell us why you're deleting your profile..."
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                            />
                            <div className="mt-4 flex justify-center gap-4">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg"
                                >
                                    Delete Profile
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {bussinessHours && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-lg w-96 p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Business Hours</h2>
                            <button
                                className="text-gray-500 hover:text-gray-800"
                                onClick={() => setBussinessHours(false)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleBussinessHours}>
                            {/* Open Time */}
                            <div className="mb-4">
                                <label
                                    htmlFor="openTime"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Open Time
                                </label>
                                <input
                                    type="time"
                                    id="openTime"
                                    name="openTime"
                                    value={formData.BussinessHours.openTime}
                                    onChange={handleChange}
                                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
                                />
                            </div>

                            {/* Close Time */}
                            <div className="mb-4">
                                <label
                                    htmlFor="closeTime"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Close Time
                                </label>
                                <input
                                    type="time"
                                    id="closeTime"
                                    name="closeTime"
                                    value={formData.BussinessHours.closeTime}
                                    onChange={handleChange}
                                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
                                />
                            </div>

                            {/* Off Day */}
                            <div className="mb-4">
                                <label
                                    htmlFor="offDay"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Off Day
                                </label>
                                <select
                                    id="offDay"
                                    name="offDay"
                                    value={formData.BussinessHours.offDay}
                                    onChange={handleChange}
                                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
                                >
                                    <option value="" disabled>
                                        Select a day
                                    </option>
                                    {offDays.map((day) => (
                                        <option key={day} value={day}>
                                            {day}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300"
                                >
                                    <i className="fas fa-save mr-2"></i> Save
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBussinessHours(false)}
                                    className="bg-gray-500 text-white px-4 py-2 rounded ml-2 hover:bg-gray-600 focus:outline-none focus:ring focus:ring-gray-300"
                                >
                                    <i className="fas fa-times-circle mr-2"></i> Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {address && (
                <AddressForm
                    addressData={addressData}
                    handleAddressChange={handleAddressChange}
                    handleGeoCode={handleGeoCode}
                    fetchCurrentLocation={fetchCurrentLocation}
                    onSubmit={handleAddressSubmit}
                    onClose={() => setAddress(false)}
                />
            )}

        </>
    );
};

export default ShopProfile;
