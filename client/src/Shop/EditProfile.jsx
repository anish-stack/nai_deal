import React, { useState, useEffect } from 'react';
import axios from 'axios'
import toast from 'react-hot-toast';
const EditProfile = ({ profile, isOpen, OnClose }) => {
    const [updateData, setUpdateData] = useState({
        UserName: '',
        ShopName: '',
        ContactNumber: '',
        Email: '',
        gstNo: '',
        ShopCategory: '',
    });
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(false);  // Loading state

    // Effect to set initial data when the profile prop is passed
    useEffect(() => {
        if (profile && isOpen) {
            setUpdateData({
                UserName: profile.UserName || '',
                ShopName: profile.ShopName || '',
                ContactNumber: profile.ContactNumber || '',
                Email: profile.Email || '',
                gstNo: profile.gstNo || '',
                ShopCategory: profile.ShopCategory || '',
            });
        }
    }, [profile, isOpen]);

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`https://www.api.naideal.com/api/v1/admin-get-categories`);
            const sortedCategories = response.data.data.sort((a, b) =>
                a.CategoriesName.localeCompare(b.CategoriesName)
            );
            setCategories(sortedCategories);
        } catch (error) {
            toast.error('Error fetching categories');
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [])

    // Handle input change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setUpdateData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check if the token exists in localStorage
        const token = localStorage.getItem('ShopToken');
        if (!token) {
            // Clear localStorage and redirect to login
            localStorage.clear();
            window.location.href = '/login';
            return;
        }

        setIsLoading(true);  // Start loading

        try {
            const res = await axios.post('https://www.api.naideal.com/api/v1/Upload-Profile-Details', updateData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            // Handle success (you can add more logic based on the response here)
            console.log('Updated Profile:', res.data);
            window.location.reload()
            OnClose();  // Close the modal after submit

        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error(error?.response?.data?.message || 'Error updating profile');
        } finally {
            setIsLoading(false);  // Stop loading
        }
    };

    // Don't render modal if isOpen is false
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-3/4 md:w-1/3">
                <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="UserName">
                            UserName
                        </label>
                        <input
                            type="text"
                            id="UserName"
                            name="UserName"
                            value={updateData.UserName}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="ShopName">
                            Shop Name
                        </label>
                        <input
                            type="text"
                            id="ShopName"
                            name="ShopName"
                            value={updateData.ShopName}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="ContactNumber">
                            Contact Number
                        </label>
                        <input
                            type="text"
                            id="ContactNumber"
                            name="ContactNumber"
                            value={updateData.ContactNumber}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="Email">
                            Email
                        </label>
                        <input
                            type="email"
                            id="Email"
                            name="Email"
                            value={updateData.Email}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="Email">
                            GST No
                        </label>
                        <input
                            type="text"
                            id="gstNo"
                            name="gstNo"
                            value={updateData.gstNo}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Shop Category</label>
                        <select
                            name="ShopCategory"
                            value={updateData.ShopCategory._id}  // Ensure correct state variable
                            onChange={handleChange}  // Properly handle updates
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select a category</option>
                            {categories.map((category) => (
                                <option key={category._id} value={category._id}>
                                    {category.CategoriesName}
                                </option>
                            ))}
                        </select>
                    </div>


                    <div className="flex justify-between items-center mt-6">
                        <button
                            type="button"
                            onClick={OnClose}
                            className="py-2 px-4 bg-gray-300 rounded-lg hover:bg-gray-400 focus:outline-none"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`py-2 px-4 ${isLoading ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none'}`}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfile;
