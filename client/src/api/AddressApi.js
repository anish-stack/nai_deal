import axios from 'axios';

export const updateShopAddress = async (shopId, addressData, coords, token) => {
  const response = await axios.put(
    `http://localhost:7485/api/v1/update-shop-address/${shopId}`,
    {
      ShopAddress: {
        ...addressData.ShopAddress,
        ShopLatitude: coords?.latitude || addressData.ShopAddress.ShopLatitude,
        ShopLongitude: coords?.longitude || addressData.ShopAddress.ShopLongitude
      },
      LandMarkCoordinates: addressData.LandMarkCoordinates
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.data;
};

export const fetchShopDetails = async (shopId) => {
  const response = await axios.get(`http://localhost:7485/api/v1/get-single-user/${shopId}`);
  return response.data;
};