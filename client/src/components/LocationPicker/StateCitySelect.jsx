import React from 'react';
import INDIA_LOCATIONS, { getCitiesForState } from '../../data/indiaLocations';

/**
 * Manual State -> City picker. Replaces Google Places Autocomplete /
 * Geocoding entirely - no API key, no network call, works offline.
 *
 * onChange is called with { state, city, lat, lng } whenever either
 * dropdown changes. lat/lng come from the static dataset (city-center
 * approximation) so callers always get a valid coordinate pair.
 */
const StateCitySelect = ({
  state = '',
  city = '',
  onChange,
  required = true,
  className = '',
  labelClassName = 'block text-sm font-medium text-gray-700 mb-1',
  inputClassName = 'w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300',
}) => {
  const cities = getCitiesForState(state);

  const handleStateChange = (e) => {
    const newState = e.target.value;
    onChange?.({ state: newState, city: '', lat: null, lng: null });
  };

  const handleCityChange = (e) => {
    const newCity = e.target.value;
    const match = getCitiesForState(state).find((c) => c.name === newCity);
    onChange?.({
      state,
      city: newCity,
      lat: match?.lat ?? null,
      lng: match?.lng ?? null,
    });
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      <div>
        <label className={labelClassName}>State</label>
        <select
          name="State"
          value={state}
          onChange={handleStateChange}
          required={required}
          className={inputClassName}
        >
          <option value="">Select State</option>
          {INDIA_LOCATIONS.map((s) => (
            <option key={s.state} value={s.state}>
              {s.state}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClassName}>City</label>
        <select
          name="City"
          value={city}
          onChange={handleCityChange}
          required={required}
          disabled={!state}
          className={`${inputClassName} ${!state ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        >
          <option value="">{state ? 'Select City' : 'Select a state first'}</option>
          {cities.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default StateCitySelect;
