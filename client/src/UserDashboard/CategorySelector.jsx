import React from 'react';

export default function CategorySelector({ categories = [], value, onChange }) {
  return (
    <div>
      <label htmlFor="ShopCategory" className="mb-1.5 block text-sm font-medium text-slate-700">
        Business category <span className="text-red-500">*</span>
      </label>
      <select
        id="ShopCategory"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm
                   outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
      >
        <option value="">Select a category</option>
        {categories.map((category) => (
          <option key={category._id} value={category._id}>
            {category.CategoriesName}
          </option>
        ))}
      </select>
    </div>
  );
}
