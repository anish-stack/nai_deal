import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const CouponSelector = ({ coupons, onCouponSelect }) => {
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [manualCoupon, setManualCoupon] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isValid, setIsValid] = useState(null);

  const handleCouponSelect = (coupon) => {
    setSelectedCoupon(coupon);
    setManualCoupon('');
    setIsValid(true);
    onCouponSelect(coupon);
    toast.success(`Coupon "${coupon.code}" applied with ${coupon.discount}% discount`);
  };

  const handleManualInput = (e) => {
    setManualCoupon(e.target.value);
    setSelectedCoupon(null);
    setIsValid(null);
  };

  const verifyCoupon = async () => {
    if (!manualCoupon.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await axios.post('https://api.naideal.com/api/v1/verify-coupon-code', {
        code: manualCoupon
      });

      if (response.data.success) {
        setIsValid(true);
        onCouponSelect(response.data.data);
        toast.success('Coupon applied successfully!');
      } else {
        setIsValid(false);
        onCouponSelect(null);
        toast.error('Invalid coupon code');
      }
    } catch (error) {
      setIsValid(false);
      onCouponSelect(null);
      toast.error(error.response?.data?.message || 'Invalid coupon code');
    } finally {
      setIsVerifying(false);
    }
  };

  const removeCoupon = () => {
    setSelectedCoupon(null);
    setManualCoupon('');
    setIsValid(null);
    onCouponSelect(null);
    toast.success('Coupon removed');
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">Apply Coupon</label>
      
      {/* Available Coupons */}
      {coupons && coupons.length > 0 && (
        <div className="mb-3">
          <p className="text-sm text-gray-600 mb-2">Available Coupons:</p>
          <div className="flex flex-wrap gap-2">
            {coupons.map((coupon) => (
              <button
                key={coupon._id}
                type="button"
                onClick={() => handleCouponSelect(coupon)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  selectedCoupon && selectedCoupon._id === coupon._id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                }`}
              >
                {coupon.code} ({coupon.discount}% off)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual Coupon Input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={manualCoupon}
          onChange={handleManualInput}
          placeholder="Enter coupon code"
          disabled={selectedCoupon !== null}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="button"
          onClick={verifyCoupon}
          disabled={isVerifying || !manualCoupon || selectedCoupon !== null}
          className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? 'Verifying...' : 'Apply'}
        </button>
      </div>

      {/* Status Display */}
      {isValid !== null && (
        <div className={`mt-2 text-sm ${isValid ? 'text-green-600' : 'text-red-600'}`}>
          {isValid ? 'Coupon applied successfully!' : 'Invalid coupon code'}
        </div>
      )}

      {/* Selected Coupon Display */}
      {selectedCoupon && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-blue-800">{selectedCoupon.code}</p>
              <p className="text-sm text-blue-600">{selectedCoupon.discount}% discount applied</p>
            </div>
            <button
              type="button"
              onClick={removeCoupon}
              className="text-blue-700 hover:text-blue-900"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponSelector;