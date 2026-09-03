import React from 'react';
import StateCitySelect from '../components/LocationPicker/StateCitySelect';

const LocationInput = ({ formData, setFormData, onLocationSelect }) => {
  const handleLocationChange = ({ state, city, lat, lng }) => {
    setFormData(prev => ({
      ...prev,
      ShopAddress: {
        ...prev.ShopAddress,
        State: state || '',
        City: city
      }
    }));
    onLocationSelect?.({ state, city, lat, lng });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <input
            type="text"
            required
            value={formData.ShopAddress.ShopNo}
            onChange={(e) =>
              setFormData({
                ...formData,
                ShopAddress: { ...formData.ShopAddress, ShopNo: e.target.value },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Pin Code</label>
          <input
            type="text"
            required
            value={formData.ShopAddress.PinCode}
            onChange={(e) =>
              setFormData({
                ...formData,
                ShopAddress: { ...formData.ShopAddress, PinCode: e.target.value },
              })
            }
            pattern="\d{6}"
            title="6-digit pin code"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="sm:col-span-2">
          <StateCitySelect
            state={formData.ShopAddress.State}
            city={formData.ShopAddress.City}
            onChange={handleLocationChange}
            labelClassName="block text-sm font-medium text-gray-700"
            inputClassName="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Landmark</label>
          <input
            type="text"
            required
            value={formData.ShopAddress.NearByLandMark}
            onChange={(e) =>
              setFormData({
                ...formData,
                ShopAddress: { ...formData.ShopAddress, NearByLandMark: e.target.value },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Street Address</label>
          <input
            type="text"
            value={formData.ShopAddress.ShopAddressStreet}
            onChange={(e) =>
              setFormData({
                ...formData,
                ShopAddress: { ...formData.ShopAddress, ShopAddressStreet: e.target.value },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default LocationInput;
