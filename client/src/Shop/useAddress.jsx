import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const useAddress = (shopDetails) => {
  const [addressData, setAddressData] = useState({
    ShopAddress: {
      State: '',
      City: '',
      PinCode: '',
      ShopAddressStreet: '',
      ShopLatitude: '',
      ShopLongitude: '',
      ShopNo: '',
      NearByLandMark: ''
    },
    LandMarkCoordinates: null
  });

  useEffect(() => {
    if (shopDetails?.ShopAddress) {
      setAddressData({
        ShopAddress: {
          State: shopDetails.ShopAddress.State || '',
          City: shopDetails.ShopAddress.City || '',
          PinCode: shopDetails.ShopAddress.PinCode || '',
          ShopAddressStreet: shopDetails.ShopAddress.ShopAddressStreet || '',
          ShopLatitude: shopDetails.ShopAddress.Location?.coordinates?.[1] || '',
          ShopLongitude: shopDetails.ShopAddress.Location?.coordinates?.[0] || '',
          ShopNo: shopDetails.ShopAddress.ShopNo || '',
          NearByLandMark: shopDetails.ShopAddress.NearByLandMark || ''
        },
        LandMarkCoordinates: shopDetails.LandMarkCoordinates || null
      });
    }
  }, [shopDetails]);

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddressData(prev => ({
      ...prev,
      ShopAddress: {
        ...prev.ShopAddress,
        [name]: value
      }
    }));
  };

  // Replaces the old Google Places Autocomplete + Geocoding flow. The user
  // picks State + City manually (see StateCitySelect); we get lat/lng from
  // the static dataset instead of a paid API call.
  const handleLocationSelect = ({ state, city, lat, lng }) => {
    if (!city) {
      toast.error('Please select a city');
      return;
    }
    setAddressData(prev => ({
      ...prev,
      ShopAddress: {
        ...prev.ShopAddress,
        State: state || '',
        City: city,
        ShopLatitude: lat ?? prev.ShopAddress.ShopLatitude,
        ShopLongitude: lng ?? prev.ShopAddress.ShopLongitude
      },
      LandMarkCoordinates: lat != null && lng != null
        ? { type: 'Point', coordinates: [lng, lat] }
        : prev.LandMarkCoordinates
    }));
  };

  return {
    addressData,
    handleAddressChange,
    handleLocationSelect
  };
};

export default useAddress;
