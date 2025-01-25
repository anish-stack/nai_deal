import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Store, AlertCircle, Loader2 } from 'lucide-react';
import leftImage from './register.png'

const ShopLogin = () => {
  const [formData, setFormData] = useState({
    any: "",
    Password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const BackendUrl = import.meta.env.VITE_REACT_APP_BACKEND_URL;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    setError("");
  };

  const validateForm = () => {
    if (!formData.any || !formData.Password) {
      setError("All fields are required");
      return false;
    }

    if (formData.Password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post(`${BackendUrl}/login-shop-user`, formData);
      console.log(response)
      const { token, login, message, order, user } = response.data;

      if (message === 'Payment Pending Please Pay First') {
        toast.error('Payment Pending Please Pay First')

        const options = {
          key: "rzp_live_VM1rZfiucpi71n",
          amount: order?.amount,
          currency: "INR",
          name: "Nai Deal",
          description: `Payment For Plans Name ${user.ListingPlan}`,
          image: "https://res.cloudinary.com/dglihfwse/image/upload/c_thumb,w_200,g_face/v1733212496/naideal-logo_fajvxe.png",
          order_id: order?.id,
          callback_url: `${BackendUrl}/paymentverification`,
          prefill: {
            name: user.UserName,
            email: user.Email,
            contact: user.ContactNumber
          },
          theme: { color: "#121212" }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.on('payment.failed', () => {
          toast.error('Payment failed. Please try again.');
        });
        razorpay.open();
        return;
      }
      localStorage.setItem('ShopToken', token);
      localStorage.setItem('ShopUser', login);

      toast.success('Login successful! Redirecting to dashboard...');
      setTimeout(() => {
        window.location.href = "/Shop-Dashboard";
      }, 3000);

    } catch (error) {
      console.log(error)
      const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  if (localStorage.getItem('ShopToken')) {
    return window.location.href = "/Shop-Dashboard"
  }



  return (
    <div className="relative bg-gradient-to-b from-blue-50 to-white">
      <div className="flex items-center justify-center">
        <div className=" hidden md:flex relative w-1/2">
          <img
            src={leftImage}
            alt="Sign Up"
            className="w-full h-full object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black opacity-50"></div>
          <div className="absolute inset-0 flex justify-center items-center text-white">
            <div className="text-center">
              <h2 className="text-3xl font-bold">Create an Account</h2>
              <p className="mt-2 text-lg">Sign up today to join our community and start exploring exclusive features.</p>
              <div className="mt-6">
                <a
                  href="/Free-Listing"
                  className="inline-block mx-2 w-64 px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-medium transition-colors duration-200"
                >
                  Sign Up
                </a>
              </div>
            </div>
          </div>
        </div>



        <div className="relative bg-gradient-to-b from-blue-50 to-white w-full md:w-1/2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className=" min-h-dvh bg-gradient-to-b from-blue-50 to-white flex flex-col justify-center px-6 py-12 lg:px-8"
          >
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 mx-auto bg-blue-600 rounded-full flex items-center justify-center"
              >
                <Store className="w-10 h-10 text-white" />
              </motion.div>

              <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                Login
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Access your dashboard
              </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white px-6 py-8 shadow-xl rounded-xl sm:px-10"
              >
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4 p-3 rounded-lg bg-red-50 flex items-center gap-2 text-red-700"
                    >
                      <AlertCircle className="w-5 h-5" />
                      <p className="text-sm">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="Email" className="block text-sm font-medium text-gray-700">
                      Username, Phone Number, or Email Address
                    </label>
                    <div className="mt-1">
                      <input
                        id="Email"
                        name="any"
                        type="text"
                        autoComplete="any"
                        required
                        value={formData.any}
                        onChange={handleChange}
                        className="block w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="Password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="Password"
                        name="Password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={formData.Password}
                        onChange={handleChange}
                        className="block w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <a href="/Forget-Password" className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200">
                        Forgot your password?
                      </a>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white font-medium transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </motion.button>

                </form>
                <p className="mt-4 text-center text-md text-gray-600">
                  I don't Have an account !! <a href='/Free-Listing' className='text-blue-600'>Create New Account</a>
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>

  );
};

export default ShopLogin;
