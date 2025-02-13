import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const Category = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const BackendUrl = import.meta.env.VITE_REACT_APP_BACKEND_URL;
    const [cityData, setCityData] = useState({
        city: '',
        found: false
    })
    // Responsive items per page
    useEffect(() => {
        const foundData = JSON.parse(sessionStorage.getItem('cityFound'))
        const foundCity = sessionStorage.getItem('cityName');
        if (foundData && foundCity) {
            setCityData({
                city: foundCity,
                found: true
            })
        }
    }, [])


    const [itemsPerPage, setItemsPerPage] = useState(12);

    useEffect(() => {
        const handleResize = () => {
            setItemsPerPage(12);
            setCurrentPage(0);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${BackendUrl}/admin-get-categories`);
            setCategories(response.data.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const nextPage = () => {
        setCurrentPage(prev =>
            prev + 1 >= Math.ceil(categories.length / itemsPerPage) ? 0 : prev + 1
        );
    };

    const prevPage = () => {
        setCurrentPage(prev =>
            prev - 1 < 0 ? Math.ceil(categories.length / itemsPerPage) - 1 : prev - 1
        );
    };

    const visibleCategories = categories.slice(
        currentPage * itemsPerPage,
        (currentPage + 1) * itemsPerPage
    );

    const CategoryCard = ({ category, index }) => {
        const colors = [
            'bg-blue-50 hover:bg-blue-100',
            'bg-purple-50 hover:bg-purple-100',
            'bg-pink-50 hover:bg-pink-100',
            'bg-green-50 hover:bg-green-100',
            'bg-yellow-50 hover:bg-yellow-100'
        ];

        const colorClass = colors[index % colors.length];

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ y: -10 }}
                className="flex flex-col items-center"
            >
                <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="relative group cursor-pointer"
                >
<a href={`/Post-by-categories?filter=Categories&Name=${category._id.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')}&title=${category.CategoriesName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')}`} className="block">

                        <div className={`rounded-full p-6 ${colorClass} transition-all duration-300 shadow-sm group-hover:shadow-xl`}>
                            <div className="w-20 h-20 flex items-center justify-center">
                                <img
                                    src={category.CategoriesImage.imageUrl}
                                    alt={category.CategoriesName}
                                    className="w-12 h-12 object-contain transform transition-transform duration-300 group-hover:scale-125"
                                />
                            </div>
                        </div>

                        <div className="mt-4 text-center">
                            <h3 className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
                                {category.CategoriesName}
                            </h3>
                        </div>
                    </a>
                </motion.div>
            </motion.div>
        );
    };

    const LoadingSkeleton = () => (
        <div className="flex flex-col items-center animate-pulse">
            <div className="rounded-full bg-gray-200 w-32 h-32"></div>
            <div className="mt-4 h-4 w-20 bg-gray-200 rounded"></div>
        </div>
    );

    return (
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

            <motion.div

                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center  justify-center text-center gap-4 sm:gap-6 md:gap-8"
            >
                <h2 className="text-3xl font-bold text-center text-gray-900 mb-6">
                    {cityData?.found ? `Popular Categories in ${cityData.city}` : `Popular Categories`}
                    <div className="w-36 h-1 mt-2 bg-blue-500 mx-auto rounded-full"></div>
                </h2>
            </motion.div>

            <div className="relative">
                {!loading && categories.length > itemsPerPage && (
                    <>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 p-3 rounded-full bg-white shadow-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300 hidden lg:block"
                            onClick={prevPage}
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 p-3 rounded-full bg-white shadow-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300 hidden lg:block"
                            onClick={nextPage}
                            aria-label="Next page"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </motion.button>
                    </>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-10 gap-8 sm:gap-10">
                    <AnimatePresence mode="wait">
                        {loading ? (
                            Array(itemsPerPage).fill(0).map((_, index) => (
                                <LoadingSkeleton key={index} />
                            ))
                        ) : (
                            visibleCategories.map((category, index) => (
                                <CategoryCard
                                    key={category._id || index}
                                    category={category}
                                    index={index}
                                />
                            ))
                        )}
                    </AnimatePresence>
                </div>

                {/* Mobile Navigation */}
                {!loading && categories.length > itemsPerPage && (
                    <div className="mt-8 flex justify-center gap-4 lg:hidden">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-3 rounded-full bg-white shadow-md text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300"
                            onClick={prevPage}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-3 rounded-full bg-white shadow-md text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300"
                            onClick={nextPage}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </motion.button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Category;