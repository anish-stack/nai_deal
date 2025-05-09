import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const AllPackages = () => {
    const [packages, setPackages] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState({
        _id: '',
        packageName: '',
        packagePrice: '',
        postsDone: '',
        validity: ''
    });

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const response = await axios.get(`https://www.api.naideal.com/api/v1/admin-packages`);
                setPackages(response.data.packages);
            } catch (error) {
                console.error('Error fetching packages:', error);
            }
        };

        fetchPackages();
    }, []);

    const handleDelete = async id => {
        try {
            await axios.delete(`https://www.api.naideal.com/api/v1/admin-delete-packages/${id}`);
            setPackages(packages.filter(pkg => pkg._id !== id));
            toast.success("Package deleted");
        } catch (error) {
            console.error('Error deleting package:', error);
        }
    };

    const handleUpdateClick = packageToUpdate => {
        setSelectedPackage(packageToUpdate);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    const handleChange = e => {
        const { name, value } = e.target;
        setSelectedPackage(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleUpdateSubmit = async e => {
        e.preventDefault();
        try {
            await axios.put(`https://www.api.naideal.com/api/v1/admin-update-packages/${selectedPackage._id}`, selectedPackage);
            toast.success("Package updated");
            handleCloseModal();
            const updatedPackages = packages.map(pkg => (pkg._id === selectedPackage._id ? selectedPackage : pkg));
            setPackages(updatedPackages);
        } catch (error) {
            console.error('Error updating package:', error);
            toast.error("Error in package update");
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-4">All Packages</h2>
            <div className="flex mb-4 mt-4">
                <Link
                    to="/create-package"
                    className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 transition duration-300"
                >
                    Create Package
                </Link>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300">
                    <thead>
                        <tr>
                            <th className="border border-gray-300 px-4 py-2">Name</th>
                            <th className="border border-gray-300 px-4 py-2">Posts</th>
                            <th className="border border-gray-300 px-4 py-2">Price</th>
                            <th className="border border-gray-300 px-4 py-2">Validity (Days)</th>
                            <th className="border border-gray-300 px-4 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {packages.map(pkg => (
                            <tr key={pkg._id}>
                                <td className="border border-gray-300 px-4 py-2">{pkg.packageName}</td>
                                <td className="border border-gray-300 px-4 py-2">{pkg.postsDone}</td>
                                <td className="border border-gray-300 px-4 py-2">{pkg.packagePrice}</td>
                                <td className="border border-gray-300 px-4 py-2">{pkg.validity}</td>
                                <td className="border border-gray-300 px-4 py-2">
                                    <button
                                        onClick={() => handleUpdateClick(pkg)}
                                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded mr-2"
                                    >
                                        Update
                                    </button>
                                    <button
                                        onClick={() => handleDelete(pkg._id)}
                                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-gray-500 bg-opacity-50">
                    <div className="bg-white p-8 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-bold mb-4">Update Package</h2>
                        <form onSubmit={handleUpdateSubmit}>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="packageName">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    id="packageName"
                                    name="packageName"
                                    value={selectedPackage.packageName}
                                    onChange={handleChange}
                                    className="border border-gray-300 rounded-md p-2 w-full"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="postsDone">
                                    Posts
                                </label>
                                <input
                                    type="text"
                                    id="postsDone"
                                    name="postsDone"
                                    value={selectedPackage.postsDone}
                                    onChange={handleChange}
                                    className="border border-gray-300 rounded-md p-2 w-full"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="packagePrice">
                                    Price
                                </label>
                                <input
                                    type="text"
                                    id="packagePrice"
                                    name="packagePrice"
                                    value={selectedPackage.packagePrice}
                                    onChange={handleChange}
                                    className="border border-gray-300 rounded-md p-2 w-full"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="validity">
                                    Validity (Days)
                                </label>
                                <input
                                    type="number"
                                    id="validity"
                                    name="validity"
                                    value={selectedPackage.validity}
                                    onChange={handleChange}
                                    className="border border-gray-300 rounded-md p-2 w-full"
                                    required
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                                >
                                    Update Package
                                </button>
                                <button
                                    onClick={handleCloseModal}
                                    className="ml-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllPackages;
