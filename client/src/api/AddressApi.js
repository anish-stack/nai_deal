import api from './axiosInstance';

export const updateShopAddress = async (shopId, addressData, token) => {
  const response = await api.put(
    `/update-shop-address/${shopId}`,
    {
      ShopAddress: {
        ...addressData.ShopAddress
      },
      LandMarkCoordinates: addressData.LandMarkCoordinates
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 15000
    }
  );
  return response.data;
};

export const fetchShopDetails = async (shopId) => {
  const response = await api.get(`/get-single-user/${shopId}`, { timeout: 15000 });
  return response.data;
};
