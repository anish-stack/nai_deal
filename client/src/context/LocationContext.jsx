import React, { createContext, useState, useEffect, useCallback } from 'react';

export const LocationContext = createContext();

const STORAGE_KEY = 'nd_selected_location';

const readStoredLocation = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.city === 'string' && parsed.city) return parsed;
    return null;
  } catch (error) {
    console.error('Error reading stored location:', error);
    return null;
  }
};

/**
 * Manual location context. Previously this asked for browser geolocation
 * and reverse-geocoded it via the paid Google Maps API on every page load.
 * That is gone: the user picks their State + City once (see
 * StateCitySelect), it is stored locally, and re-used instantly on every
 * visit - no permission prompt, no external API, no key, faster load.
 */
export const LocationProvider = ({ children }) => {
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState(null); // { lat, lng } approx city center
  const [showPicker, setShowPicker] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredLocation();
    if (stored) {
      setState(stored.state || '');
      setCity(stored.city || '');
      setCoords(stored.lat != null && stored.lng != null ? { lat: stored.lat, lng: stored.lng } : null);
    } else {
      setShowPicker(true);
    }
    setReady(true);
  }, []);

  const selectLocation = useCallback(({ state: newState, city: newCity, lat, lng }) => {
    if (!newCity) return;
    setState(newState || '');
    setCity(newCity);
    setCoords(lat != null && lng != null ? { lat, lng } : null);
    setShowPicker(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: newState || '', city: newCity, lat, lng }));
    } catch (error) {
      console.error('Error saving location:', error);
    }
  }, []);

  const clearLocation = useCallback(() => {
    setState('');
    setCity('');
    setCoords(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing location:', error);
    }
    setShowPicker(true);
  }, []);

  return (
    <LocationContext.Provider
      value={{
        state,
        city,
        coords,
        ready,
        showPicker,
        setShowPicker,
        selectLocation,
        clearLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
