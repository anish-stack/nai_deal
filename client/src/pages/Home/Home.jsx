import React, { useState, useEffect } from 'react';
import api from '../../api/axiosInstance';
import { Building, MapPin, Star, Users } from 'lucide-react';



import Categorey from '../../components/Category/Categorey';
import MCategorey from '../../components/Category/Mobile';
import AllListings from '../../components/Listings/AllListings';
import { Newsletter } from '../Hero/Newsletter';
import Hero from '../Hero/Hero';
import { ServiceCard } from '../About/ServiceCard';
import { StatsSection } from '../About/StatsSection';
import AllListing from '../Listings/AllListing';
import CustomerFaq from '../../components/CFaq/CustomerFaq';
import OfferBanner from '../../components/OfferBanners/OfferBanner';

import Free_Page from '../Free_Page/Free_Page';

import CityAll from '../../components/City/CityAll';
import Free_Page2 from '../Free_Page/Free_Page2';
import Free_Page3 from '../Free_Page/Free_Page3';
import Free_Page4 from '../Free_Page/Free_Page4';
import DynamicCity from '../../components/City/DynamicCity';

const services = [
  {
    icon: Building,
    title: "Join Now",
    description: "Sign up today and unlock new opportunities to promote your business, connect with customers, and grow your brand",
    iconColor: "bg-blue-600",
  },
  {
    icon: Star,
    title: "List Your Business",
    description: "Post exclusive offers and promotions to attract new customers and grow your business.",
    iconColor: "bg-yellow-500",
  },
  {
    icon: Users,
    title: "Post Offer",
    description: "Attract more customers by posting special offers and deals. Create irresistible promotions that boost your sales and visibility",
    iconColor: "bg-green-600",
  },
  {
    icon: MapPin,
    title: "Connect with Customers",
    description: "Engage with your audience directly. Build lasting relationships and turn leads into loyal customers through easy communication. ",
    iconColor: "bg-red-500",
  },
];
const Home = () => {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    let cancelled = false;
    const fetchSettings = async () => {
      try {
        const response = await api.get('/get-setting', { timeout: 15000 });
        if (!cancelled && response.data?.success) {
          setSettings(response.data.data || {});
        }
      } catch (error) {
        console.error('Error fetching settings:', error.message);
      }
    };
    fetchSettings();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      {settings?.isFestiveTopPopUpShow && (

        <div className=''>
          <img className='fixed hidden md:block z-50 w-32 left-0 top-12' src={settings?.AboveTopGif} alt="" />
          <img className='fixed  hidden md:block  z-50 w-32 right-0 top-12' src={settings?.AboveTopGif} alt="" />
        </div>
      )}

      <Hero />
      <DynamicCity/>
      <div className='hidden lg:block'>
        <Categorey />
      </div>
      <div className='block lg:hidden'>
        <MCategorey />
      </div>
      <Free_Page />
      <AllListing limit={16} />
      <CityAll />
      {/* <AllListings /> */}
      {/* <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Comprehensive solutions designed to help your business thrive in the digital age
        </p>
      </div> */}

      <Free_Page2 />
      {/* 
      <div className="grid max-w-screen-xl mx-auto grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {services.map((service, index) => (
          <ServiceCard key={index} {...service} />
        ))}
      </div> */}
      <StatsSection />


      <OfferBanner />
      <Newsletter />
      <Free_Page3 />
      {settings?.isFestiveBottomPopUpShow && (

        <>
          <img className='fixed z-50 w-32 bottom-0' src={settings?.BottomGifLink} alt="" />
          <img className='fixed z-50 right-0 w-32 bottom-0' src={settings?.BottomGifLink} alt="" />
        </>
      )}


    </div>
  );
};

export default Home;
