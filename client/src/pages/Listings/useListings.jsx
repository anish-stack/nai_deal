import { useState, useEffect, useContext } from 'react';
import api from '../../api/axiosInstance';
import { LocationContext } from '../../context/LocationContext';


export function useListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { city } = useContext(LocationContext);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(false);
      try {
        // With a city selected, ask for listings near that city; otherwise
        // just fetch everything. Neither path depends on Google Maps.
        const url = city
          ? `/get-Listing-By-Address?address=${encodeURIComponent(JSON.stringify({ city }))}`
          : '/get-listing';

        const response = await api.get(url, { timeout: 15000 });
        if (!cancelled) {
          setListings(Array.isArray(response.data?.data) ? response.data.data : []);
        }
      } catch (err) {
        console.error('Error fetching listings:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [city]);

  return {
    listings,
    loading,
    error,
  };
}
