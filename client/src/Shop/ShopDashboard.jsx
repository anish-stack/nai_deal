import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus } from 'lucide-react';
import ShopProfile from './ShopProfile';
import MyPost from './MyPost';
import CreateListing from './CreateListing';
import toast from 'react-hot-toast';

const ShopDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('ShopToken');
  const [shopDetails, setShopDetails] = useState(null);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const BackendUrl = import.meta.env.VITE_REACT_APP_BACKEND_URL;



  const fetchMyShopDetails = async () => {
    try {
      const response = await axios.get(`${BackendUrl}/My-Shop-Details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(response.data.user);
      setShopDetails(response.data.user);
    } catch (error) {
      console.error('Error fetching shop details:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('ShopToken');
        navigate('/Shop-login');
      }
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    const fetchData = async () => {
      try {

      } catch (error) {
        console.log("Internal server error", error)
      }
    }
  }, [])

  useEffect(() => {
    if (!token) {
      navigate('/Shop-login');
      return;
    }
    fetchMyShopDetails();
  }, [token, navigate]);

  const handleUploadProfile = async () => {
    if (!profile) {
      toast.error('Please Choose Your Profile Pic For Shop');
      return;
    }
    const formData = new FormData();
    formData.append('image', profile);
    try {
      const response = await axios.post(
        'https://api.naideal.com/api/v1/Upload-Profile-Image',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Handle successful response
      toast.success('Profile image uploaded successfully');
      fetchMyShopDetails(); // Refresh shop details after upload
    } catch (error) {
      console.error('Error uploading profile image:', error);
      toast.error('Failed to upload profile image');
    }
  };

  const handleUpgradePackage = (id) => {
    navigate(`/upgrade-package/${id}`);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/Shop-login');
  };

  if (!token) {
    return null;
  }

  // console.log("shopDetails.PackagePlanIssued ",shopDetails.PackagePlanIssued )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Shop Profile */}
          <div className="lg:col-span-1">
            <ShopProfile
              shopDetails={shopDetails}
              onUpgradePackage={() => handleUpgradePackage(shopDetails?._id)}
              onLogout={handleLogout}
              onProfileUpload={handleUploadProfile}
              setProfile={setProfile}
            />
          </div>

          {/* Right Column - Posts */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">My Posts</h2>
                  <p className="text-gray-600">
                    {shopDetails ? (
                      `${shopDetails.HowMuchOfferPost || "0"} / ${shopDetails.PackagePlanIssued
                      } posts used`
                    ) : "Loading..."}
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateListingOpen(true)}
                  disabled={shopDetails?.HowMuchOfferPost >= shopDetails?.PackagePlanIssued}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors 
    ${shopDetails?.HowMuchOfferPost >= shopDetails?.PackagePlanIssued
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-500 hover:bg-green-600 text-white"
                    }`}
                >
                  <Plus className="w-5 h-5" />
                  Post Offer
                </button>
              </div>

              <MyPost fetchMyShopDetails={fetchMyShopDetails} />
            </div>
          </div>
        </div>
      </div>

      {isCreateListingOpen && (
        <CreateListing
          isOpen={isCreateListingOpen}
          onClose={() => setIsCreateListingOpen(false)}
          listingBtn={shopDetails.PackagePlanIssued}
        />
      )}
    </div>
  );
};

export default ShopDashboard;
