import React from 'react';
import { MapPin, Clock, Phone, Mail, Award, ExternalLink, BadgeCheck } from 'lucide-react';

const Shop_card = ({ data }) => {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 pt-6">
            {data.map((shop) => (
                <div key={shop._id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                    {/* Shop Image */}
                    <div className="relative h-48">
                        <img
                            src={shop.ProfilePic}
                            alt={shop.ShopName || shop.UserName}
                            className="w-full h-full object-cover"
                        />
                        {(shop.ListingPlan === "Gold" || shop.ListingPlan === "Silver") && (
                            <div className="absolute top-4 right-4">
                                <div className="bg-yellow-400 text-black px-3 py-1 rounded-full flex items-center gap-1">
                                    <BadgeCheck size={16} />
                                    <span className="text-sm font-semibold">Verified</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Shop Info */}
                    <div className="p-4">
                    <a  href={`/View-More-Offers/Shop-profile/${shop?._id}/${shop.ShopName.replace(/\s+/g, '-')}}`}
          key={shop._id} >
                        <h3 className="text-xl font-bold mb-1">{shop.ShopName || shop.UserName}</h3>
</a>
                        {shop.ShopCategory && (
                            <p className="text-gray-600 mb-1 text-sm">
                                {shop.ShopCategory.CategoriesName}
                            </p>
                        )}

                        {shop.ShopAddress && (
                            <div className="flex items-start gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                                <p className="text-sm text-gray-600">
                                    {shop.ShopAddress.ShopNo}, {shop.ShopAddress.ShopAddressStreet}
                                </p>
                            </div>
                        )}

                                                

                        

<div className='flex justify-center'>
            <a  href={`/View-More-Offers/Shop-profile/${shop?._id}/${shop.ShopName.replace(/\s+/g, '-')}}`}
          key={shop._id}  className='bottom-3 mb-4 mx-auto bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-center'>View More</a>
           </div>     
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Shop_card