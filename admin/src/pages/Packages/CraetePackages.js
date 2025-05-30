import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const CreatePackage = () => {
    const [packageDetails, setPackageDetails] = useState({
        packageName: '',
        postsDone: '',
        packagePrice: '',
        validity: '' // Added validity field
    });

    const handleChange = e => {
        const { name, value } = e.target;
        setPackageDetails(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSubmit = async e => {
        e.preventDefault();
        try {
            const response = await axios.post(`https://api.naideal.com/api/v1/admin-create-packages`, packageDetails);
            console.log('Package created:', response.data);
            toast.success("Package created");
            window.location.href = `/All-Packages`;
        } catch (error) {
            console.error('Error creating package:', error);
            toast.error("Error creating package");
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-4">Create Package</h2>

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="packageName">
                        Package Name
                    </label>
                    <input
                        type="text"
                        id="packageName"
                        name="packageName"
                        value={packageDetails.packageName}
                        onChange={handleChange}
                        className="border border-gray-300 rounded-md p-2 w-full"
                        required
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="postsDone">
                        How Many Posts in This Package
                    </label>
                    <input
                        type="text"
                        id="postsDone"
                        name="postsDone"
                        value={packageDetails.postsDone}
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
                        value={packageDetails.packagePrice}
                        onChange={handleChange}
                        className="border border-gray-300 rounded-md p-2 w-full"
                        required
                    />
                </div>

                {/* Validity Field */}
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="validity">
                        Validity (in days)
                    </label>
                    <input
                        type="number"
                        id="validity"
                        name="validity"
                        value={packageDetails.validity}
                        onChange={handleChange}
                        className="border border-gray-300 rounded-md p-2 w-full"
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Create Package
                </button>
            </form>
        </div>
    );
};

export default CreatePackage;
