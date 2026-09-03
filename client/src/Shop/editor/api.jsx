import api from '../../api/axiosInstance';
export const fetchPost = async (id) => {
  const token = localStorage.getItem('ShopToken');
  const response = await api.get('/My-Shop-Post', {
    headers: { Authorization: `Bearer ${token}` },
  });
  // console.log(response.data.data.find(p => p._id === id))
  return response.data.data.find(p => p._id === id);
};

export const updatePost = async (id, formData) => {
  const token = localStorage.getItem('ShopToken');
  return api.put(`/My-Shop-Edit-post/${id}`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
};