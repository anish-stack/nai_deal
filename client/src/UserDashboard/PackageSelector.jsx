import React from 'react';

/**
 * Listing plan dropdown.
 *
 * The old default option had value="Free", so a user who never touched the
 * dropdown silently submitted "Free" - which is not a real package name and
 * failed plan lookup on the server. The placeholder now has an empty value
 * so the required-field check can actually catch it.
 */
const PackageSelector = ({ packages = [], value, onChange }) => {
  return (
    <div>
      <label htmlFor="ListingPlan" className="mb-1.5 block text-sm font-medium text-slate-700">
        Listing plan <span className="text-red-500">*</span>
      </label>
      <select
        id="ListingPlan"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm
                   outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
      >
        <option value="">Select a plan</option>
        {packages.map((pkg) => (
          <option key={pkg._id} value={pkg.packageName}>
            {pkg.packageName} — Rs {pkg.packagePrice}
            {pkg.postsDone ? ` (${pkg.postsDone} posts)` : ''}
          </option>
        ))}
      </select>
    </div>
  );
};

export default PackageSelector;
