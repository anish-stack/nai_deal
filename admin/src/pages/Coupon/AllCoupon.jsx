import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-react';

const AllCoupon = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openModal, setOpenModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState(null);
    const [newCoupon, setNewCoupon] = useState({
        code: '',
        discount: '',
        active: true,
        expiryDate: ''
    });

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            const { data } = await axios.get('https://www.api.naideal.com/api/v1/get-all-coupon-code');
            setCoupons(data.data.reverse());
        } catch (error) {
            console.error("Error fetching coupons:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewCoupon({ ...newCoupon, [name]: value });
    };

    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.post('https://www.api.naideal.com/api/v1/create-coupon-code', newCoupon);
            setCoupons([data, ...coupons]);
            fetchCoupons();
            closeModal();
        } catch (error) {
            console.error("Error creating coupon:", error);
        }
    };

    const handleEditClick = async (id) => {
        try {
            const { data } = await axios.get(`https://www.api.naideal.com/api/v1/get-single-coupon-code/${id}`);
            setNewCoupon({
                ...data.data,
                expiryDate: data.data.expiryDate.split('T')[0] // Extracting only YYYY-MM-DD
            });
            setSelectedCoupon(id);
            setIsEditing(true);
            setOpenModal(true);
        } catch (error) {
            console.error("Error fetching coupon details:", error);
        }
    };


    const handleUpdateCoupon = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.put(`https://www.api.naideal.com/api/v1/update-coupon-code/${selectedCoupon}`, newCoupon);
            setCoupons(coupons.map(coupon => coupon._id === selectedCoupon ? data.data : coupon));
            closeModal();
        } catch (error) {
            console.error("Error updating coupon:", error);
        }
    };

    const closeModal = () => {
        setOpenModal(false);
        setIsEditing(false);
        setSelectedCoupon(null);
        setNewCoupon({ code: '', discount: '', active: true, expiryDate: '' });
    };

    const handleDeleteCoupon = async (id) => {
        try {
            await axios.delete(`https://www.api.naideal.com/api/v1/delete-coupon-code/${id}`);
            setCoupons(coupons.filter(coupon => coupon._id !== id));
        } catch (error) {
            console.error("Error deleting coupon:", error);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Coupon Management</h1>
                <button onClick={() => setOpenModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2">
                    <Plus size={20} /> Add Coupon
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin text-blue-600" size={48} />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {coupons.map((coupon) => (
                        <div key={coupon._id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                            <h3 className="text-xl font-semibold text-gray-800">{coupon.code}</h3>
                            <p className="text-gray-600">Discount: {coupon.discount}%</p>
                            <p className={`text-sm font-medium ${coupon.active ? 'text-green-600' : 'text-red-600'}`}>{coupon.active ? 'Active' : 'Inactive'}</p>
                            <p className="text-gray-500 text-sm">Expiry: {new Date(coupon.expiryDate).toLocaleDateString()}</p>
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => handleEditClick(coupon._id)} className="flex-1 bg-blue-100 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-2">
                                    <Pencil size={16} /> Edit
                                </button>
                                <button onClick={() => handleDeleteCoupon(coupon._id)} className="flex-1 bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center gap-2">
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {openModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">{isEditing ? 'Edit Coupon' : 'Add Coupon'}</h2>
                            <button onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={isEditing ? handleUpdateCoupon : handleCreateCoupon} className="space-y-4">
                            <input type="text" name="code" placeholder="Coupon Code" value={newCoupon.code} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" required />
                            <input type="number" name="discount" placeholder="Discount %" value={newCoupon.discount} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" required />
                            <input type="date" name="expiryDate" value={newCoupon.expiryDate} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" required />
                            <button type="submit" className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{isEditing ? 'Update Coupon' : 'Create Coupon'}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllCoupon;
