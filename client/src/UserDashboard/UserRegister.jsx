import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeolocated } from 'react-geolocated';
import axios from 'axios';
import toast from 'react-hot-toast';
import LocationInput from './LocationInput';
import PackageSelector from './PackageSelector';
import CategorySelector from './CategorySelector';
import CouponSelector from './CouponSelector';
import image from './register.png'

const initialFormData = {
    UserName: '',
    Email: '',
    ContactNumber: '',
    ShopName: '',
    ShopAddress: {
        City: '',
        PinCode: '',
        ShopAddressStreet: '',
        ShopLatitude: '',
        ShopLongitude: '',
        ShopNo: '',
        NearByLandMark: ''
    },
    LandMarkCoordinates: '',
    ShopCategory: '',
    ListingPlan: 'Free',
    HowMuchOfferPost: '',
    Password: '',
    gstNo: '',
    couponCode: ''
};
const BackendUrl = import.meta.env.VITE_REACT_APP_BACKEND_URL;
const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
const validatePhoneNumber = (number) => /^\d{10}$/.test(number);
const validatePinCode = (pincode) => /^\d{6}$/.test(pincode);
const validateGST = (gst) => /^[0-9A-Z]{15}$/.test(gst);
// console.log(BackendUrl)
const UserRegister = () => {
    const [formData, setFormData] = useState(initialFormData);
    const [categories, setCategories] = useState([]);
    const [packages, setPackages] = useState([]);
    const navigate = useNavigate();
    const [allCoupon, setAllCoupon] = useState([]);
    const [appliedCoupon, setAppliedCoupon] = useState(null);

    const { coords, isGeolocationAvailable, isGeolocationEnabled } = useGeolocated({
        positionOptions: { enableHighAccuracy: false },
        userDecisionTimeout: 5000,
    });
    
    const handleFetchCoupon = async() => {
        try {
            const {data} = await axios.get('https://api.naideal.com/api/v1/get-all-coupon-code')
            const allData = data.data
            setAllCoupon(allData)
        } catch (error) {
            console.log("Internal server error",error)
        }
    }

    useEffect(() => {
        fetchCategories();
        fetchPackages();
        handleFetchCoupon();
    }, []);

    useEffect(() => {
        if (coords) {
            fetchCurrentLocation();
        }
    }, [coords]);

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${BackendUrl}/admin-get-categories`);
            const sortedCategories = response.data.data.sort((a, b) =>
                a.CategoriesName.localeCompare(b.CategoriesName)
            );
            setCategories(sortedCategories);
        } catch (error) {
            toast.error('Error fetching categories');
        }
    };

    const fetchPackages = async () => {
        try {
            const response = await axios.get(`${BackendUrl}/admin-packages`);
            setPackages(response.data.packages);
        } catch (error) {
            toast.error('Error fetching packages');
        }
    };

    const fetchCurrentLocation = async () => {
        if (!coords) return;

        try {
            const response = await axios.post(`https://api.naideal.com/Fetch-Current-Location`, {
                lat: coords.latitude,
                lng: coords.longitude
            });

            const locationData = response.data.data;
            setFormData(prev => ({
                ...prev,
                ShopAddress: {
                    ...prev.ShopAddress,
                    City: locationData.address?.city || '',
                    PinCode: locationData.address?.postalCode || '',
                    ShopAddressStreet: locationData.address?.completeAddress || '',
                    ShopLatitude: locationData.address?.lat || '',
                    ShopLongitude: locationData.address?.lng || ''
                }
            }));
        } catch (error) {
            toast.error('Error fetching location');
        }
    };
    
    const handleGeoCode = async (landmark) => {
        if (!landmark) {
            toast.error('Please enter landmark to proceed')
            return
        }
        try {
            const response = await axios.get(`https://api.naideal.com/geocode?address=${landmark}`)
            const locationData = response.data;
            console.log(locationData)
            setFormData((prev) => ({
                ...prev,
                LandMarkCoordinates: {
                    type: 'Point',
                    coordinates: [locationData?.longitude, locationData?.latitude]
                }
            }))
        } catch (error) {
            console.log(error)
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;
        setFormData({ ...formData, [name]: newValue });
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;

        if (name === "Email" && !validateEmail(value)) {
            toast.error("Invalid email format");
        } else if (name === "ContactNumber" && !validatePhoneNumber(value)) {
            toast.error("Invalid phone number");
        } else if (name === "PinCode" && !validatePinCode(value)) {
            toast.error("Invalid pin code");
        } else if (name === "gstNo" && value && !validateGST(value)) {
            toast.error("Invalid GST number");
        }
    };

    

    const handleCouponSelect = (coupon) => {
        setAppliedCoupon(coupon);
        if (coupon) {
            setFormData(prev => ({
                ...prev,
                couponCode: coupon.code
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                couponCode: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Check for empty fields
        if (!formData.UserName) {
            toast.error("Username is required.");
            return;
        }
        if (!formData.Email) {
            toast.error("Email is required.");
            return;
        }
        if (!formData.ContactNumber) {
            toast.error("Contact Number is required.");
            return;
        }
        if (!formData.ShopName) {
            toast.error("Business Name is required.");
            return;
        }
        if (!formData.ShopAddress.City) {
            toast.error("City is required.");
            return;
        }
        if (!formData.ShopAddress.PinCode) {
            toast.error("Pin Code is required.");
            return;
        }
        if (!formData.ShopAddress.ShopAddressStreet) {
            toast.error("Shop Address Street is required.");
            return;
        }
        if (!formData.ShopCategory) {
            toast.error("Business Category is required.");
            return;
        }
        if (!formData.ListingPlan) {
            toast.error("Listing Plan is required.");
            return;
        }
        if (!formData.Password) {
            toast.error("Password is required.");
            return;
        }

        console.log("object",formData)
        
        try {
            const response = await axios.post(`${BackendUrl}/register-list-user`, formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('B2bToken')}`
                }
            });
            
            console.log("response.data.order",response.data)
            if (formData.ListingPlan === 'Free Plan') {
                toast.success('Business listed successfully');
                return navigate('/Shop-login');
            } else {
                const order = response.data.order;
                const options = {
                    key: "rzp_live_VM1rZfiucpi71n",
                    amount: order?.amount,
                    currency: "INR",
                    name: "Nai Deal",
                    description: `Payment For Plans Name ${formData.ListingPlan}`,
                    image: "https://res.cloudinary.com/dglihfwse/image/upload/c_thumb,w_200,g_face/v1733212496/naideal-logo_fajvxe.png",
                    order_id: order?.id,
                    callback_url: `${BackendUrl}/paymentverification`,
                    prefill: {
                        name: formData.UserName,
                        email: formData.Email,
                        contact: formData.ContactNumber
                    },
                    theme: { color: "#121212" }
                };

                const razorpay = new window.Razorpay(options);
                razorpay.on('payment.failed', () => {
                    toast.error('Payment failed. Please try again.');
                });
                razorpay.open();
            }

            localStorage.removeItem('formData');
        } catch (error) {
            console.log(error)
            toast.error(error.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <>
            <div className="gap-6 w-full max-w-7xl mx-auto grid lg:grid-cols-2 grid-cols-1 bg-white mt-2 overflow-hidden">
                <div className="relative w-full">
                    <img
                        src={image}
                        alt="Sign Up"
                        className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black opacity-50"></div>
                    <div className="absolute inset-0 flex justify-center items-center text-white">
                        <div className="text-center p-10">
                            <h2 className="text-3xl font-bold">Welcome Back!</h2>
                            <p className="mt-2 text-lg">If you already have an account, please sign in to access your account and upload your latest offers.</p>
                            <div className="mt-6">
                                <a
                                    href="/Shop-login"
                                    className="inline-block mx-2 px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-medium transition-colors duration-200"
                                >
                                    Sign In
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Section */}
                <div className="flex flex-col items-center justify-center ">
                    <h2 className="mt-5 font-extrabold text-center text-gray-800 ">
                        Register Your Business
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6 p-5 w-full ">
                        {/* Basic Information */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Username</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.UserName}
                                    onChange={(e) => {
                                        if (e.target.value.includes(' ')) {
                                            alert('Spaces are not allowed in the username.');
                                            return;
                                        }
                                        setFormData({ ...formData, UserName: e.target.value });
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === ' ') {
                                            e.preventDefault();
                                            alert('Spaces are not allowed in the username.');
                                        }
                                    }}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Business Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.ShopName}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    name='ShopName'
                                    className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={formData.Email}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    name='Email'
                                    className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                                <input
                                    type="tel"
                                    value={formData.ContactNumber}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    name='ContactNumber'
                                    className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Location Information */}
                        <LocationInput
                            formData={formData}
                            setFormData={setFormData}
                            GeoCode={handleGeoCode}
                            isGeolocationAvailable={isGeolocationAvailable}
                            isGeolocationEnabled={isGeolocationEnabled}
                        />

                        {/* Category and Package Selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <CategorySelector
                                categories={categories}
                                value={formData.ShopCategory}
                                onChange={(category) => setFormData({ ...formData, ShopCategory: category })}
                            />

                            <PackageSelector
                                packages={packages}
                                value={formData.ListingPlan}
                                onChange={(plan) => setFormData({ ...formData, ListingPlan: plan })}
                            />
                        </div>

                        {/* Coupon Section */}
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <CouponSelector 
                                coupons={allCoupon} 
                                onCouponSelect={handleCouponSelect} 
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">GST No. (optional)</label>
                                <input
                                    type="text"
                                    value={formData.gstNo}
                                    name='gstNo'
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <input
                                    type="password"
                                    required
                                    name='Password'
                                    value={formData.Password}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className="max-w-[220px] px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className='text-center'>
                            <button
                                type="submit"
                                className="max-w-[320px] w-full py-3 px-6 bg-blue-600 text-white text-lg font-semibold rounded-md shadow hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                Register Your Business
                            </button>
                            <p className='mt-5'><a href="/terms-and-conditions" target='_blank'>Read terms and conditions</a></p>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

export default UserRegister
