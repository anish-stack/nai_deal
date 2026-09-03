import React from 'react';
import StateCitySelect from '../components/LocationPicker/StateCitySelect';

const AddressForm = ({ addressData, handleAddressChange, handleLocationSelect, onSubmit, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Update Shop Address</h2>
          <button type="button" className="text-gray-500 hover:text-gray-800" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shop No
            </label>
            <input
              type="text"
              name="ShopNo"
              value={addressData.ShopAddress.ShopNo}
              onChange={handleAddressChange}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
              required
            />
          </div>

          <StateCitySelect
            state={addressData.ShopAddress.State}
            city={addressData.ShopAddress.City}
            onChange={handleLocationSelect}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address
            </label>
            <input
              type="text"
              name="ShopAddressStreet"
              value={addressData.ShopAddress.ShopAddressStreet}
              onChange={handleAddressChange}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pin Code
            </label>
            <input
              type="text"
              name="PinCode"
              value={addressData.ShopAddress.PinCode}
              onChange={handleAddressChange}
              pattern="\d{6}"
              title="6-digit pin code"
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nearby Landmark
            </label>
            <input
              type="text"
              name="NearByLandMark"
              value={addressData.ShopAddress.NearByLandMark}
              onChange={handleAddressChange}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
              required
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Update Address
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddressForm;
