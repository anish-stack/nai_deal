import React from 'react';
import { X } from 'lucide-react';

const ItemForm = ({ item, index, onChange, onRemove, canRemove }) => {
  // Calculate the after-discount price
  const calculateDiscountedPrice = (mrp, discount) => {
    if (!mrp || isNaN(mrp) || !discount || isNaN(discount)) return '';
    return (mrp - (mrp * discount) / 100).toFixed(2);
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          type="text"
          name="itemName"
          placeholder="Item Name"
          value={item.itemName}
          onChange={(e) => onChange(index, e)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
        <input
          type="number"
          name="Discount"
          placeholder="Discount %"
          value={item.Discount}
          onChange={(e) => onChange(index, e)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
          min="0"
          max="100"
        />
        <input
          type="number"
          name="MrpPrice"
          placeholder="MRP Price"
          value={item.MrpPrice}
          onChange={(e) => onChange(index, e)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
        <input
          type="text"
          name="AfterDiscountPrice"
          placeholder="After Discount Price"
          value={calculateDiscountedPrice(item.MrpPrice, item.Discount)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-200 text-gray-700 cursor-not-allowed"
          readOnly
        />
      </div>
      
      <div className="flex items-center justify-between">
        <input
          type="file"
          name="dishImages"
          multiple
          onChange={(e) => onChange(index, e)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          accept="image/*"
        />
        
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="ml-4 p-2 text-red-500 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ItemForm;
