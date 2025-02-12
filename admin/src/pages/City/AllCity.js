import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { MapPin, Plus, Pencil, Trash2, X, Upload, Loader2 } from 'lucide-react';

const AllCity = () => {
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [citiesPerPage] = useState(12);
    const [createData, setCreateData] = useState({ cityName: '', image: null, previewUrl: '' });
    const [updateData, setUpdateData] = useState({ cityName: '', image: null, previewUrl: '' });
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [selectedCityId, setSelectedCityId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchCities = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:7485/api/v1/admin-get-city');
            setCities(response.data || []);
        } catch (error) {
            toast.error('Failed to fetch cities');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCities();
    }, []);

    const handleImagePreview = (file, setData, currentData) => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setData({ ...currentData, image: file, previewUrl: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!createData.cityName.trim() || !createData.image) {
            toast.error('Please fill in all fields');
            return;
        }

        const formData = new FormData();
        formData.append('cityName', createData.cityName.trim());
        formData.append('image', createData.image);

        try {
            setIsSubmitting(true);
            await axios.post('http://localhost:7485/api/v1/admin-create-city', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setCreateData({ cityName: '', image: null, previewUrl: '' });
            setOpenCreateModal(false);
            await fetchCities();
            toast.success('City created successfully');
        } catch (error) {
            toast.error('Failed to create city');
        } finally {
            setIsSubmitting(false);
        }
    };
    console.log(updateData)

    const handleEdit = async (e) => {
        e.preventDefault();
        if (!updateData.cityName.trim()) {
            toast.error('City name is required');
            return;
        }

        const formData = new FormData();
        formData.append('cityName', updateData.cityName.trim());
        if (updateData.image) {
            formData.append('image', updateData.image);
        }
        console.log(updateData)

        try {
            setIsSubmitting(true);
            await axios.post(`http://localhost:7485/api/v1/admin-update-city/${selectedCityId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUpdateData({ cityName: '', image: null, previewUrl: '' });
            setOpenEditModal(false);
            await fetchCities();
            toast.success('City updated successfully');
        } catch (error) {
            toast.error('Failed to update city');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this city?')) return;

        try {
            setIsSubmitting(true);
            await axios.delete(`http://localhost:7485/api/v1/admin-delete-city/${id}`);
            await fetchCities();
            toast.success('City deleted successfully');
        } catch (error) {
            toast.error('Failed to delete city');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModalWithCity = (city) => {
        setUpdateData({
            cityName: city.cityName,
            image: null,
            previewUrl: city.imageUrl
        });
        setSelectedCityId(city._id);
        setOpenEditModal(true);
    };

    const indexOfLastCity = currentPage * citiesPerPage;
    const indexOfFirstCity = indexOfLastCity - citiesPerPage;
    const currentCities = cities.slice(indexOfFirstCity, indexOfLastCity);
    const pageCount = Math.ceil(cities.length / citiesPerPage);

    const Modal = ({ isOpen, onClose, title, children }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
                        disabled={isSubmitting}
                    >
                        <X size={20} />
                    </button>
                    <h2 className="text-2xl font-bold mb-6">{title}</h2>
                    {children}
                </div>
            </div>
        );
    };

    const ImagePreview = ({ url, size = "h-32" }) => {
        if (!url) return null;
        return (
            <div className={`${size} w-full relative rounded-lg overflow-hidden bg-gray-100`}>
                <img
                    src={url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                />
            </div>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <MapPin className="text-blue-600" />
                    City Management
                </h1>
                <button
                    onClick={() => setOpenCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    disabled={isSubmitting}
                >
                    <Plus size={20} />
                    Add City
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin text-blue-600" size={48} />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {currentCities.map((city) => (
                            <div
                                key={city._id}
                                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                            >
                                <div className="h-48 bg-gray-100">
                                    <img
                                        src={city.image.url}
                                        alt={city.cityName}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="p-4">
                                    <h3 className="text-xl font-semibold text-gray-800 mb-4">{city.cityName}</h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModalWithCity(city)}
                                            className="flex-1 bg-blue-100 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
                                            disabled={isSubmitting}
                                        >
                                            <Pencil size={16} />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(city._id)}
                                            className="flex-1 bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                                            disabled={isSubmitting}
                                        >
                                            <Trash2 size={16} />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {pageCount > 1 && (
                        <div className="flex justify-center mt-8 gap-2">
                            {[...Array(pageCount)].map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentPage(index + 1)}
                                    className={`px-4 py-2 rounded-lg ${currentPage === index + 1
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {index + 1}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            <Modal
                isOpen={openCreateModal}
                onClose={() => setOpenCreateModal(false)}
                title="Add New City"
            >
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            City Name
                        </label>
                        <input
  type="text"
  value={createData.cityName}
  onChange={(e) => setCreateData({ cityName: e.target.value })}
  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  placeholder="Enter city name"
  disabled={isSubmitting}
  autoFocus
/>


                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            City Image
                        </label>
                        <div className="relative">
                            <input
                                type="file"
                                onChange={(e) => handleImagePreview(e.target.files[0], setCreateData, createData)}
                                className="hidden"
                                id="createImageInput"
                                accept="image/*"
                                disabled={isSubmitting}
                            />
                            <label
                                htmlFor="createImageInput"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50"
                            >
                                <Upload size={20} />
                                Choose Image
                            </label>
                        </div>
                        <ImagePreview url={createData.previewUrl} />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                            Create City
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={openEditModal}
                onClose={() => setOpenEditModal(false)}
                title="Edit City"
            >
                <form onSubmit={handleEdit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            City Name
                        </label>
                        <input
                            type="text"
                            value={updateData.cityName}
                            onChange={(e) => setUpdateData({ ...updateData, cityName: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter city name"
                            disabled={isSubmitting}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            City Image
                        </label>
                        <div className="relative">
                            <input
                                type="file"
                                onChange={(e) => handleImagePreview(e.target.files[0], setUpdateData, updateData)}
                                className="hidden"
                                name="image"
                                id="updateImageInput"
                                accept="image/*"
                                disabled={isSubmitting}
                            />
                            <label
                                htmlFor="updateImageInput"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50"
                            >
                                <Upload size={20} />
                                Choose New Image
                            </label>
                        </div>
                        <ImagePreview url={updateData.previewUrl} />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Pencil size={16} />}
                            Update City
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AllCity;