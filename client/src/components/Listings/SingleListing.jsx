import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Mail, Star, ChevronRight, CheckCircle, Share2, Heart, Tag, X } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import Free_Page4 from '../../pages/Free_Page/Free_Page4';
import toast from 'react-hot-toast';

const SingleListing = () => {
    const { id } = useParams();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [formLoading, setFormLoading] = useState(false)
    const BackendUrl = import.meta.env.VITE_REACT_APP_BACKEND_URL;
    const [shopId, setShopId] = useState('')
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        message: "",
        shopId: shopId || "",
        otp: ""
    });

    const [otpSent, setOtpSent] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [isOtpVisible, setIsOtpVisible] = useState(true);

    // useEffect(() => {
    //     const timer = setTimeout(() => {
    //         setShowForm(true);
    //     }, 2000);

    //     return () => clearTimeout(timer);
    // }, []);

    useEffect(() => {
        setFormData((prevData) => ({
            ...prevData,
            shopId: shopId
        }));
    }, [shopId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value
        }));
    };

    const sendOtp = async () => {
        if (!formData.phone) {
            toast.error("Please enter your phone number.");
            return;
        }

        setOtpLoading(true);
        try {
            const res = await axios.post("https://api.naideal.com/api/v1/send_otp_form", {
                phone: formData.phone
            });
            const resMessage = res?.data?.message
            if (resMessage == 'OTP already verified') {
                setIsOtpVisible(false)
                setOtpSent(true)
                toast.success(res?.data?.message || "OTP sent successfully!");
            } else {
                setOtpSent(true);
                setIsOtpVisible(true)
                toast.success(res?.data?.message || "OTP sent successfully!");
            }
        } catch (error) {
            console.log("Error sending OTP:", error?.response?.data?.message);
            toast.error(error?.response?.data?.message || "Failed to send OTP.");
        } finally {
            setOtpLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!otpSent) {
            toast.error("Please verify your phone number first.");
            return;
        }

        // if (!formData.otp) {
        //     toast.error("Please enter the OTP.");
        //     return;
        // }

        setFormLoading(true);
        try {
            const response = await axios.post("https://api.naideal.com/api/v1/verify_otp_and_send_enquiry_form", formData);
            toast.success("Form submitted successfully");
            setShowForm(false);
            setOtpSent(false);
            setFormData({
                name: "",
                email: "",
                phone: "",
                message: "",
                shopId: shopId,
                otp: ""
            });
        } catch (error) {
            console.error("Error submitting form:", error);
            toast.error(error.response?.data?.message || "Failed to submit form.");
        } finally {
            setFormLoading(false);
        }
    };

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        fetchSingleData();
    }, [id]);

    const calculateDiscountPrice = (originalPrice, discountPercentage) => {
        if (!originalPrice || !discountPercentage) return originalPrice; // If no discount, return the original price.

        const discountAmount = (originalPrice * discountPercentage) / 100;
        const finalPrice = originalPrice - discountAmount;

        return finalPrice; // Returning price with 2 decimal places
    };



    const fetchSingleData = async () => {
        try {
            const response = await axios.get(`${BackendUrl}/get-listing/${encodeURIComponent(id)}`);
            console.log(response.data.data)
            setListing(response.data.data);
            setShopId(response.data.data?.shopDetails?._id)
            setLoading(false);
        } catch (error) {
            console.error('Error fetching single data:', error);
            setLoading(false);
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: listing.Title,
                text: listing.Details,
                url: window.location.href,
            });
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <Skeleton height={400} className="mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                        <Skeleton height={200} className="mb-4" />
                        <Skeleton count={3} className="mb-2" />
                    </div>
                    <Skeleton height={300} />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-7xl mx-auto px-4 py-8"
        >
            {/* Popup Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
                        onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-md relative"
                        >
                            <button
                                onClick={() => setShowForm(false)}
                                className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
                            <p className="text-gray-600 mb-6">Fill out this form and we'll get back to you soon!</p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                    {!otpSent ? (
                                        <button
                                            type="button"
                                            onClick={sendOtp}
                                            className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                            disabled={otpLoading}
                                        >
                                            {otpLoading ? "Sending OTP..." : "Send OTP"}
                                        </button>
                                    ) : (
                                        isOtpVisible ? (
                                            <p className="text-green-600 text-sm mt-1">OTP sent! Enter it below.</p>

                                        ) : (
                                            ''
                                        )
                                    )}
                                </div>

                                {!isOtpVisible ? (
                                    ''
                                ) : (
                                    otpSent && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                                            <input
                                                type="text"
                                                name="otp"
                                                value={formData.otp}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            />
                                        </div>
                                    )
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        rows="4"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                                    disabled={formLoading}
                                >
                                    {formLoading ? "Submitting..." : "Submit"}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Breadcrumbs */}
            <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-8">
                <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
                <ChevronRight className="w-4 h-4" />
                <Link to="/listings" className="hover:text-blue-600 transition-colors">Listings</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-gray-900 font-medium truncate">{listing.Title}</span>
            </nav>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2">
                    {/* Image Gallery */}
                    <div className="bg-gray-100 rounded-2xl overflow-hidden mb-8">
                        <motion.div
                            className="relative aspect-[16/9]"
                            layoutId={`listing-image-${listing._id}`}
                        >
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={selectedImage}
                                    src={listing.Pictures[selectedImage]?.ImageUrl}
                                    alt={listing.Title}
                                    className="w-full h-full object-cover"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                />
                            </AnimatePresence>
                            <div className="absolute bottom-4 left-4 right-4">
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {listing.Pictures.map((pic, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedImage(index)}
                                            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${selectedImage === index ? 'border-blue-500 scale-110' : 'border-transparent opacity-70'
                                                }`}
                                        >
                                            <img
                                                src={pic.ImageUrl}
                                                alt={`Thumbnail ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Title and Actions */}
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">{listing.Title}</h1>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsLiked(!isLiked)}
                                className={`p-2 rounded-full transition-colors ${isLiked ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500'
                                    }`}
                            >
                                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                            </button>
                            <button
                                onClick={handleShare}
                                className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                            >
                                <Share2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Business Details */}
                    <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
                        <a href={`/View-More-Offers/Shop-profile/${listing?.shopDetails?._id}/${listing?.shopDetails?.ShopName}`} className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                <a href={`/View-More-Offers/Shop-profile/${listing?.shopDetails?._id}/${listing?.shopDetails?.ShopName}`}> {listing.shopDetails?.ShopName?.[0] || 'N'}</a>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {listing.shopDetails?.ShopName}
                                    {listing.shopDetails?.ListingPlan !== 'Free' && (
                                        <CheckCircle className="inline-block w-5 h-5 text-green-500 ml-2" />
                                    )}
                                </h2>
                                <p className="text-gray-600">{listing.shopDetails?.ShopCategory?.CategoriesName}</p>
                            </div>
                        </a>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                                    <div>
                                        <p className="font-medium text-gray-900">Location</p>
                                        <p className="text-gray-600">{listing.shopDetails?.ShopAddress.ShopAddressStreet}</p>
                                        <p className="text-gray-600">{listing.shopDetails?.ShopAddress.NearByLandMark}</p>
                                        <p className="text-gray-600">{listing.shopDetails?.ShopAddress.PinCode}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Phone className="w-5 h-5 text-gray-400 mt-1" />
                                    <div>
                                        <p className="font-medium text-gray-900">Contact</p>
                                        {/* <p className="text-gray-600">{listing.shopDetails?.ContactNumber}</p> */}
                                        <p className="text-gray-600">
                                            {listing.shopDetails?.showNumber
                                                ? `${listing.shopDetails.ContactNumber}`
                                                : `${listing.shopDetails.ContactNumber.slice(0, 2)}******${listing.shopDetails.ContactNumber.slice(-2)}`}
                                        </p>

                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Mail className="w-5 h-5 text-gray-400 mt-1" />
                                    <div>
                                        <p className="font-medium text-gray-900">Email</p>
                                        {/* <p className="text-gray-600">{listing.shopDetails?.Email}</p> */}
                                        <p className="text-gray-600">
                                            {listing.shopDetails?.showEmail
                                                ? `${listing.shopDetails?.Email}`
                                                : `${listing.shopDetails?.Email.slice(0, 2)}******${listing.shopDetails?.Email.slice(-2)}`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-md shadow-md">
                        <p
                            className="text-gray-700 text-base leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: listing?.HtmlContent }}
                        ></p>
                    </div>


                    {/* Items/Offers Section */}
                    <div className="bg-white rounded-2xl shadow-sm border p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Current Offers</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {listing.Items.map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="aspect-[4/3] rounded-lg overflow-hidden mb-4">
                                        <img
                                            src={item?.dishImages?.[0]?.ImageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                                            alt={item.itemName}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-2">{item.itemName}</h3>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Tag className="w-4 h-4 text-gray-400" />
                                            <del className="text-gray-900">₹{item.MrpPrice}</del>
                                            <span className="text-gray-900">₹{item?.AfterDiscountPrice || calculateDiscountPrice(item.MrpPrice, item.Discount)}</span>
                                        </div>
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-medium">
                                            {item.Discount}% Off
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column - Contact and Similar Listings */}
                <div className="lg:col-span-1">
                    <div className="sticky top-8 space-y-6">
                        {/* Quick Contact Card */}
                        <div className="bg-white rounded-2xl shadow-sm border p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Contact</h3>
                            <div className="space-y-4">
                                <p className="text-gray-600">
                                    {listing.shopDetails?.showNumber
                                        ? <>
                                            <a
                                                href={`tel:${listing.shopDetails?.ContactNumber}`}
                                                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                                            >
                                                <Phone className="w-5 h-5" />
                                                Call Now
                                            </a>
                                            <a
                                                href={`mailto:${listing.shopDetails?.Email}`}
                                                className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 px-4 rounded-lg font-medium transition-colors"
                                            >
                                                <Mail className="w-5 h-5" />
                                                Send Email
                                            </a>
                                        </>
                                        : <>

                                        </>}
                                </p>

                                <button
                                    onClick={() => setShowForm(true)}
                                    className="flex items-center justify-center gap-2 w-full bg-[#1FB355] hover:bg-[#0ea345] text-white py-3 px-4 rounded-lg font-medium transition-colors"
                                >
                                    <Mail className="w-5 h-5" />
                                    Contact Us
                                </button>
                            </div>
                        </div>

                        {/* Business Hours */}
                        {
                            listing?.shopDetails?.BussinessHours ? (
                                <div className="bg-white rounded-2xl shadow-sm border p-6">
                                    <div className="flex items-center gap-2 mb-4">

                                        <i className="fa-regular fa-clock text-3xl text-gray-400"></i>
                                        <h3 className="text-lg font-semibold text-gray-900">Business Hours</h3>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Working Time</span>
                                            <span className="text-gray-900 font-medium">{`${listing?.shopDetails?.BussinessHours?.openTime || "09:00 AM"} - ${listing?.shopDetails?.BussinessHours?.closeTime || "11:00 PM"}`}</span>                                    {/* <span className="text-gray-900 font-medium">9:00 AM - 6:00 PM</span> */}
                                        </div>
                                        {/* <div className="flex justify-between">
                                    <span className="text-gray-600">Saturday</span>
                                    <span className="text-gray-900 font-medium">10:00 AM - 4:00 PM</span>
                                </div> */}
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">{listing?.shopDetails?.BussinessHours?.offDay === 'All Day Open' ? 'Open' : 'Closed'}</span>

                                            <span className="text-red-600 font-medium">{listing?.shopDetails?.BussinessHours?.offDay === 'All Day Open' ? 'All Day Open' : listing?.shopDetails?.BussinessHours?.offDay}</span>

                                        </div>
                                    </div>
                                </div>
                            ) : (<></>)
                        }


                        <div className="bg-white rounded-xl shadow-md border p-6">
                            {/* <!-- Header --> */}
                            <div className="flex items-center gap-3 mb-4">
                                <i className="fa-solid fa-shield-halved text-3xl text-blue-500"></i>
                                <h3 className="text-lg font-semibold text-gray-900">Safety Tips</h3>
                            </div>

                            {/* <!-- Content --> */}
                            <div className="space-y-4 text-sm">
                                <p className="text-gray-700 leading-relaxed">
                                    <span className="font-medium text-gray-900">Stay Safe:</span> Always meet in person, bring a friend when dealing with expensive items, thoroughly inspect products and services before making any payments, and only pay once you’re completely satisfied with what you’re getting.
                                </p>
                                <p className="text-gray-700 leading-relaxed">
                                    <span className="font-medium text-gray-900">Be Prepared:</span> Communicate with the seller beforehand to confirm all details, including the price.
                                </p>
                                <p className="text-gray-700 leading-relaxed">
                                    <span className="font-medium text-gray-900">Stay Informed:</span> Do your research on the market value of the product or service to ensure you're getting a fair deal.
                                </p>
                            </div>
                        </div>

                        {/* Rating & Reviews Summary */}
                        <div className="bg-white rounded-2xl shadow-sm border p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                                <h3 className="text-lg font-semibold text-gray-900">Rating & Reviews</h3>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-3xl font-bold text-gray-900">4.8</div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className="w-4 h-4 text-yellow-400 fill-current"
                                            />
                                        ))}
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">Based on 48 reviews</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className='mt-3 '>
                <Free_Page4 />
            </div>
        </motion.div>
    );
};

export default SingleListing;