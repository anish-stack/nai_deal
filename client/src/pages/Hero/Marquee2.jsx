import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Marquee2 = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [settings, setSettings] = useState({})


    // Fetch all marquees when the component mounts
    useEffect(() => {
        const fetchSettings = async () => {
              try {
                const response = await axios.get('https://api.naideal.com/api/v1/get-setting');
                if (response.data.success) {
                  setSettings(response.data.data);
                  console.log(response.data.data)
                } else {
                  console.error(response.data.message);
                }
              } catch (error) {
                console.error('Error fetching settings:', error.message);
              }
            };
            fetchSettings();
    }, []); // Empty dependency array means this effect runs only once when the component mounts

    return (
        <div>
            <div className="bg-gradient-to-r from-[#48c777] to-[#08a742] overflow-hidden py-2">
                <div className="flex items-center justify-center">
                    <span>{settings?.marquee}</span>
                </div>
            </div>
        </div>
    );
};

export default Marquee2;
