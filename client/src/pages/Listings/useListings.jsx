import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { LocationContext } from '../../context/LocationContext';

export function useListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { location, address } = useContext(LocationContext);

  const fetchData = async () => {
    try {
      const response = await axios.get(`https://www.api.naideal.com/api/v1/get-Listing?location=${JSON.stringify(location)}&address=${JSON.stringify(address)}`);
      setListings(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching listings:', error);
      setError(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location && location.latitude && location.longitude && address && Object.keys(address).length > 0) {
      fetchData();
    }
  }, [location, address]);

  return {
    listings,
    loading,
    error,
  };
}
