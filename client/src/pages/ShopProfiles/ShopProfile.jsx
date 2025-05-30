import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Mail, Star, Building2, Tag, AlertCircle, ChevronRight } from 'lucide-react';
import MetaTag from '../../components/Meta/MetaTag';

const ShopProfile = () => {
    const { id } = useParams();
    const [shopDetails, setShopDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allData, setAllData] = useState([])
    // const BackendUrl = import.meta.env.VITE_REACT_APP_BACKEND_URL;
    const BackendUrl = 'https://api.naideal.com/api/v1';

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`${BackendUrl}/get-Listing`);
            const data = response.data.data;
            console.log("datafindShop", response)
            const filteredShop = data?.filter(item => item?.ShopId?._id === id);
            const findShop = data?.find(item => item?.ShopId?._id === id);
            console.log("filteredShop", filteredShop)
            console.log("findShop", findShop)

            if (findShop) {
                setShopDetails(findShop);
                setAllData(filteredShop)
            } else {
                throw new Error('Shop not found');
            }
        } catch (error) {
            console.error('Error fetching shop details:', error);
            setError(error.message === 'Shop not found' ? 'Shop not found' : 'Failed to load shop details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{error}</h2>
                    <p className="text-gray-600 mb-4">Please try again or contact support if the problem persists.</p>
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                        Return Home
                    </Link>
                </div>
            </div>
        );
    }

    // console.log("shopDetails",shopDetails)

    const { listing, ShopId } = shopDetails;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-gray-50"
        >
            <MetaTag title={ShopId.ShopName} />
            {/* Hero Section */}
            <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 text-white py-20">
                <div className="max-w-7xl mx-auto px-4">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-center"
                    >
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">{ShopId?.ShopName}</h1>
                        {/* <p className="text-xl text-purple-100">{ShopId?.ShopCategory}</p> */}

                        <div className="flex items-center justify-center gap-6 mt-8">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-5 h-5" />
                                <span>{ShopId?.ShopAddress.PinCode}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Building2 className="w-5 h-5" />
                                <span>{ShopId?.ListingPlan} Member</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Star className="w-5 h-5 fill-current" />
                                <span>4.8/5.0</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50"></div>
            </div>

            {/* Contact Information */}
            <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-10">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-xl shadow-lg p-6 mb-8"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <MapPin className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900">Location</h3>
                                <p className="text-gray-600">{ShopId?.ShopAddress.NearByLandMark}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Phone className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900">Phone</h3>
                                <p className="text-gray-600">
                                    {ShopId?.showNumber
                                        ? <a href={`tel:${ShopId?.ContactNumber}`} className="text-gray-600">{ShopId?.ContactNumber}</a>
                                        :<a className="text-gray-600">${ShopId.ContactNumber.slice(0, 2)}******{ShopId.ContactNumber.slice(-2)}</a>}
                                </p>
                                {/* <a href={`tel:${ShopId?.ContactNumber}`} className="text-gray-600">${ShopId.ContactNumber.slice(0, 2)}******${ShopId.ContactNumber.slice(-2)}</a> */}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <Mail className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900">Email</h3>
                                {ShopId?.showEmail
                                        ? <a href={`mailto:${ShopId?.Email}`} className="text-gray-600">{ShopId?.Email}</a>
                                        :<a className="text-gray-600">${ShopId?.Email.slice(0, 2)}******{ShopId?.Email.slice(-2)}</a>}
                                {/* <a href={`mailto:${ShopId?.Email}`} className="text-gray-600">{ShopId?.Email}</a> */}

                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Listings Grid */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <h2 className="text-2xl font-bold text-gray-900 mb-8">Available Offers</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <AnimatePresence>
                            {allData && allData.map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="border border-gray-300 bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                >

                                    <div className="relative aspect-[4/3]">
                                        <img
                                            src={item?.Pictures[0]?.ImageUrl}
                                            alt={item.Title}
                                            className="w-full h-full object-cover"
                                        />
                                        {/* <div className="absolute top-4 right-4">
                                            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                                {item.Discount}% OFF
                                            </span>
                                        </div> */}
                                    </div>

                                    <div className="p-4">
                                        <h3 className="font-semibold text-gray-900 mb-1">{item.Title}</h3>
                                        <p className=" font-medium text-gray-500 mb-2">{item.Details}</p>
                                        <div className="items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Tag className="w-4 h-4 text-gray-400" />
                                                <div className="">
                                                    {item?.tags.slice(0, 1).map((tag, index) => (
                                                        <span className=' font-light text-sm' key={index}>#{tag}</span>
                                                    ))}
                                                </div>
                                                {/* <span className="text-gray-900 font-medium">₹{item.MrpPrice}</span> */}
                                            </div>
                                            <div className="w-full flex justify-center">
                                                <Link
                                                    to={`/Single-Listing/${shopDetails._id}/${shopDetails.Title.replace(/\s+/g, '-').replace(/%/g, '')}`}
                                                    className="bg-blue-600 rounded text-center p-2 text-white hover:bg-blue-700 font-medium flex items-center gap-1"
                                                >
                                                    View Details
                                                    <ChevronRight className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default ShopProfile;