import axios from 'axios';
import React, { createContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
    const [location, setLocation] = useState(null);
    const [address, setAddress] = useState(null);


    const [status, setStatus] = useState('checking'); // checking, granted, denied



    const getLocation = async () => {
        if (!navigator.geolocation) {
            console.log("Geolocation is not supported by your browser.");
            setStatus('unsupported');
            toast.error('Geolocation is not supported in this browser.');
            return;
        }


        try {
            const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
            if (permissionStatus.state === 'denied') {
                setStatus('denied');
                toast.error('Location access is blocked. Enable it in browser settings.');
                return;
            }
        } catch (error) {
            console.log("Permission API not supported.");
        }

        // Request location
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const newLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                setLocation(newLocation);
                setStatus('granted');
                console.log("New location fetched:", newLocation);
            },
            (error) => {
                console.error("Geolocation error:", error);
                if (error.code === 1) {
                    setStatus('denied');
                    toast.error('Please allow location access in browser settings.');
                } else {
                    setStatus('error');
                    toast.error('Error fetching location.');
                }
            }
        );
    };

    const fetchCurrentCity = async () => {
        if (!location) return; // Prevent API call if location is not available

        try {
            const { data } = await axios.post('http://localhost:7485/Fetch-Current-Location', {
                lat: location.latitude,
                lng: location.longitude,
            });
            console.log("Fetched location data:",);
            setAddress(data.data.address)
        } catch (error) {
            console.error("Error fetching current city:", error);
        }
    };

    const reInitializeLocation = () => {
        setStatus('checking');
        getLocation();
    };

    useEffect(() => {
        getLocation();
    }, []);

    useEffect(() => {
        if (location) {
            fetchCurrentCity();
        }
    }, [location]); // Now only runs when `location` is fully set


    return (
        <LocationContext.Provider value={{ location, status, reInitializeLocation, address }}>
        {children}
    </LocationContext.Provider>
    );
};
