import React from 'react';
import { MapPin, Clock, Phone, Mail, Award, ExternalLink } from 'lucide-react';

const Shop_card = ({ data }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 px-2 mt-2">
            {data.map((shop) => (
                <div key={shop._id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                    {/* Shop Image */}
                    <div className="relative h-48">
                        <img
                            src={shop.ProfilePic}
                            alt={shop.ShopName || shop.UserName}
                            className="w-full h-full object-cover"
                        />
                        {shop.ListingPlan === "Gold" && (
                            <div className="absolute top-4 right-4">
                                <div className="bg-yellow-400 text-black px-3 py-1 rounded-full flex items-center gap-1">
                                    <Award size={16} />
                                    <span className="text-sm font-semibold">Shops</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Shop Info */}
                    <div className="p-4">
                        <h3 className="text-xl font-bold mb-2">{shop.ShopName || shop.UserName}</h3>

                        {shop.ShopCategory && (
                            <p className="text-gray-600 mb-3 text-sm">
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

                        {shop.BussinessHours && (
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <p className="text-sm text-gray-600">
                                    {shop.BussinessHours.OpenTime} - {shop.BussinessHours.CloseTime}
                                </p>
                            </div>
                        )}

                        {shop.ContactNumber && (
                            <div className="flex items-center gap-2 mb-2">
                                <Phone className="w-4 h-4 text-gray-500" />
                                <p className="text-sm text-gray-600">{shop.ContactNumber}</p>
                            </div>
                        )}

                        {shop.Email && (
                            <div className="flex items-center gap-2 mb-2">
                                <Mail className="w-4 h-4 text-gray-500" />
                                <p className="text-sm text-gray-600">{shop.Email}</p>
                            </div>
                        )}

                        <div className="mt-4 flex justify-end">
                            <button onClick={()=> window.location.href=`/View-More-Offers/Shop-profile/${shop?._id}/${shop?.ShopName}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors">
                                <span className="text-sm font-medium">View Details</span>
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Shop_card