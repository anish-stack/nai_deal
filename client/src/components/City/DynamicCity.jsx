import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { MapPin, Navigation, MapPinOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { LocationContext } from '../../context/LocationContext';

const DynamicCity = () => {
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCityFound, setCityFound] = useState(false);
    const { location, status, reInitializeLocation, address } = useContext(LocationContext);
    const scrollContainerRef = React.useRef(null);
    const [hoveredCity, setHoveredCity] = useState(null);

    useEffect(() => {
        const fetchCities = async () => {
            try {
                const response = await axios.get('https://api.naideal.com/api/v1/admin-get-city');
                const citiesData = response.data;
                // Sort cities with current city first
                const sortedCities = citiesData.sort((a, b) => {
                    const addressCity = address?.city?.toLowerCase() || '';
                    const aIsCurrentCity = addressCity.includes(a.cityName.toLowerCase());
                    const bIsCurrentCity = addressCity.includes(b.cityName.toLowerCase());
                    return aIsCurrentCity ? -1 : bIsCurrentCity ? 1 : 0;
                });
                setCities(sortedCities);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching cities:', error);
                setLoading(false);
            }
        };
        fetchCities();
    }, [address]);

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300;
            const container = scrollContainerRef.current;
            const targetScroll = direction === 'left'
                ? container.scrollLeft - scrollAmount
                : container.scrollLeft + scrollAmount;

            container.scrollTo({
                left: targetScroll,
                behavior: 'smooth'
            });
        }
    };
    useEffect(() => {
        if (address?.city) {
            const foundCity = cities.some((c) => {
                const regexCityName = new RegExp(`\\b${c.cityName}\\b`, 'i');
                const regexAddress = new RegExp(`\\b${address.city}\\b`, 'i');
                return regexCityName.test(address.city) || regexAddress.test(c.cityName);
            });


            setCityFound((prev) => {
                if (prev !== foundCity) {
                    sessionStorage.setItem('cityFound', JSON.stringify(foundCity));
                    sessionStorage.setItem('cityName', address?.city);
                    return foundCity;
                }
                return prev;
            });
        } else {
            setCityFound((prev) => (prev ? false : prev));
        }
    }, [address?.city, cities]);



    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }


    if (status === 'denied') {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                <motion.div
                    className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                >
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <MapPinOff className="w-8 h-8 text-red-500" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                        Enable Location Services
                    </h2>

                    <p className="text-gray-600 text-center mb-6">
                        To provide the best local experience and show available services, we need access to your location.
                    </p>

                    <motion.button
                        onClick={reInitializeLocation}
                        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Navigation className="w-5 h-5" />
                        Allow Location Access
                    </motion.button>

                    <p className="text-sm text-gray-500 text-center mt-4">
                        You can change this setting later in your browser preferences.
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 py-16 px-4">
            <div className="max-w-8xl mx-auto">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        Explore  Cities
                    </h2>
                    <div className="w-24 h-1 bg-blue-500 mx-auto rounded-full"></div>
                </motion.div>

                <div className="relative px-12">
                    <button
                        onClick={() => scroll('left')}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white transition-all"
                    >
                        <ChevronLeft className="w-6 h-6 text-gray-600" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white transition-all"
                    >
                        <ChevronRight className="w-6 h-6 text-gray-600" />
                    </button>

                    <div
                        ref={scrollContainerRef}
                        className="flex gap-8 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {cities.map((city, index) => {
                            if (!address?.city) return null;

                            const regexCityName = new RegExp(`\\b${city.cityName}\\b`, 'i');
                            const regexAddress = new RegExp(`\\b${address.city}\\b`, 'i');

                            const isCurrentCity = regexCityName.test(address.city) || regexAddress.test(city.cityName);
                            const isHovered = hoveredCity === city._id;
                            // setCityFound(isCurrentCity)
                            return (
                                <motion.div
                                    key={city.index}
                                    className="flex-none snap-center"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 0.8 }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                >
                                    <div
                                        className="relative group"
                                        onMouseEnter={() => setHoveredCity(city._id)}
                                        onMouseLeave={() => setHoveredCity(null)}
                                    >
                                        {isCurrentCity && (
                                            <div className="absolute top-1 -right-2 z-20">
                                                <div className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                                    Current City
                                                </div>
                                            </div>
                                        )}
                                        <div className={`w-48 h-48 cursor-pointer rounded-full overflow-hidden border-4 transition-all relative ${isCurrentCity || isHovered
                                            ? 'border-blue-500 shadow-xl scale-105'
                                            : 'border-white shadow-lg'
                                            }`}>
                                            <img
                                                src={city.image.url}
                                                alt={city.cityName}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-300 flex items-center justify-center ${isCurrentCity || isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                                }`}>
                                                <motion.div
                                                    initial={false}
                                                    animate={{ y: isCurrentCity || isHovered ? 0 : 20, opacity: isCurrentCity || isHovered ? 1 : 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="text-center px-4"
                                                >
                                                    <div className="flex items-center justify-center gap-1 text-white">
                                                        <MapPin className="w-3 h-3" />
                                                        <h3 className="font-semibold whitespace-nowrap text-base">
                                                            {city.cityName}
                                                        </h3>
                                                    </div>
                                                </motion.div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                
                .scroll-smooth {
                    scroll-behavior: smooth;
                    -webkit-overflow-scrolling: touch;
                }
            `}</style>
        </div>
    );
};

export default DynamicCity;