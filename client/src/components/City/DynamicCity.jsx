import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axiosInstance';
import { motion } from 'framer-motion';
import { MapPin, MapPinOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { LocationContext } from '../../context/LocationContext';
import StateCitySelect from '../LocationPicker/StateCitySelect';


const DynamicCity = () => {
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [pickerState, setPickerState] = useState('');
    const [pickerCity, setPickerCity] = useState('');
    const [pickerCoords, setPickerCoords] = useState({ lat: null, lng: null });
    const scrollContainerRef = React.useRef(null);
    const [hoveredCity, setHoveredCity] = useState(null);

    const { city, showPicker, setShowPicker, selectLocation } = useContext(LocationContext);

    useEffect(() => {
        let cancelled = false;
        const fetchCities = async () => {
            setLoading(true);
            setLoadError(false);
            try {
                const response = await api.get('/admin-get-city', { timeout: 15000 });
                const citiesData = Array.isArray(response.data) ? response.data : [];
                const sortedCities = [...citiesData].sort((a, b) => {
                    const current = city?.toLowerCase() || '';
                    const aIsCurrentCity = current && a.cityName?.toLowerCase().includes(current);
                    const bIsCurrentCity = current && b.cityName?.toLowerCase().includes(current);
                    return aIsCurrentCity ? -1 : bIsCurrentCity ? 1 : 0;
                });
                if (!cancelled) setCities(sortedCities);
            } catch (error) {
                console.error('Error fetching cities:', error);
                if (!cancelled) setLoadError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchCities();
        return () => { cancelled = true; };
    }, [city]);

    // Keep the homepage listing header ("Popular Offers in <city>") in sync.
    useEffect(() => {
        if (city && cities.length) {
            const found = cities.some((c) => c.cityName?.toLowerCase().includes(city.toLowerCase()));
            try {
                sessionStorage.setItem('cityFound', JSON.stringify(found));
                sessionStorage.setItem('cityName', city);
            } catch (error) {
                console.error('Error saving city session data:', error);
            }
        }
    }, [city, cities]);

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

    const handleConfirmLocation = () => {
        if (!pickerCity) return;
        selectLocation({ state: pickerState, city: pickerCity, lat: pickerCoords.lat, lng: pickerCoords.lng });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (showPicker) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4">
                <motion.div
                    className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                >
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <MapPin className="w-8 h-8 text-blue-500" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                        Select Your Location
                    </h2>

                    <p className="text-gray-600 text-center mb-6">
                        Tell us your state and city so we can show you offers near you.
                    </p>

                    <StateCitySelect
                        state={pickerState}
                        city={pickerCity}
                        onChange={({ state: s, city: c, lat, lng }) => {
                            setPickerState(s);
                            setPickerCity(c);
                            setPickerCoords({ lat, lng });
                        }}
                        required={false}
                    />

                    <motion.button
                        type="button"
                        onClick={handleConfirmLocation}
                        disabled={!pickerCity}
                        className="w-full mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={{ scale: pickerCity ? 1.02 : 1 }}
                        whileTap={{ scale: pickerCity ? 0.98 : 1 }}
                    >
                        <MapPin className="w-5 h-5" />
                        Confirm Location
                    </motion.button>

                    {!!setShowPicker && (
                        <button
                            type="button"
                            onClick={() => setShowPicker(false)}
                            className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
                        >
                            Skip for now
                        </button>
                    )}
                </motion.div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="flex items-center justify-center min-h-[150px] text-gray-500 gap-2">
                <MapPinOff className="w-5 h-5" />
                <span>Couldn't load cities right now.</span>
            </div>
        );
    }

    if (!cities.length) return null;

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
                        {cities.map((c, index) => {
                            const isCurrentCity = !!city && c.cityName?.toLowerCase().includes(city.toLowerCase());
                            const isHovered = hoveredCity === c._id;
                            return (
                                <motion.div
                                    key={c._id || index}
                                    className="flex-none snap-center"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 0.8 }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                >
                                    <div
                                        className="relative group"
                                        onMouseEnter={() => setHoveredCity(c._id)}
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
                                            }`}
                                            onClick={() => selectLocation({ state: '', city: c.cityName, lat: null, lng: null })}
                                        >
                                            {c.image?.url ? (
                                                <img
                                                    src={c.image.url}
                                                    alt={c.cityName}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                                    <MapPin className="w-8 h-8 text-gray-400" />
                                                </div>
                                            )}
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
                                                            {c.cityName}
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
