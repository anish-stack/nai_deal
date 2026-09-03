const Listing = require('../models/listing.model');
const Partner = require('../models/Partner.model');
const Cloudinary = require('cloudinary').v2;
const { validationResult } = require('express-validator');
const sendEmail = require('../utils/SendEmail');
const mongoose = require('mongoose')
const ListingUser = require('../models/User.model')
const dotenv = require('dotenv');
const Package = require('../models/Pacakge');
dotenv.config()
Cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.envCLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY
});



exports.getAllListing = async (req, res) => {
    try {
        const listings = await Listing.find(); // Fetch all listings from the database

        if (listings.length === 0) {
            return res.status(402).json({
                success: false,
                message: 'No listings found.',
            });
        }

        return res.status(200).json({
            success: true,
            count: listings.length,
            data: listings,
        });
    } catch (error) {
        console.error('Error fetching listings:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error. Could not fetch listings.',
        });
    }
};
exports.deleteListingById = async (req, res) => {
    try {
        const listingId = req.params.id;
        const listing = await Listing.findById(listingId);

        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }

        // Delete associated images from Cloudinary
        const deleteImage = async (public_id) => {
            return Cloudinary.uploader.destroy(public_id);
        };

        await Promise.all(listing.Pictures.map(pic => deleteImage(pic.public_id)));

        await listing.remove();
        res.status(200).json({ success: true, message: 'Listing deleted successfully' });
    } catch (error) {
        console.error('Error deleting listing:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.deleteAllListings = async (req, res) => {
    try {
        const listings = await Listing.find();

        if (listings.length === 0) {
            return res.status(404).json({ success: false, message: 'No listings found to delete' });
        }

        // Delete associated images from Cloudinary
        const deleteImage = async (public_id) => {
            return Cloudinary.uploader.destroy(public_id);
        };

        await Promise.all(
            listings.flatMap(listing => listing.Pictures.map(pic => deleteImage(pic.public_id)))
        );

        await Listing.deleteMany();
        res.status(200).json({ success: true, message: 'All listings deleted successfully' });
    } catch (error) {
        console.error('Error deleting all listings:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.getListingById = async (req, res) => {
    try {
        const listingId = req.params.id;
        const listing = await Listing.findById(listingId);

        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }

        res.status(200).json({ success: true, data: listing });
    } catch (error) {
        console.error('Error fetching listing:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

const uploadImage = (file) => {
    return new Promise((resolve, reject) => {
        const stream = Cloudinary.uploader.upload_stream((error, result) => {
            if (result) {
                resolve({ public_id: result.public_id, ImageUrl: result.secure_url });
            } else {
                reject(error);
            }
        });
        stream.end(file.buffer);
    });
};
exports.UpdateListing = async (req, res) => {
    try {
        const ShopId = req.user.id;
        const ListingId = req.params.id;

        if (!ShopId) {
            return res.status(401).json({ success: false, msg: "Please Login" });
        }

        console.log(req.body);

        const CheckMyShop = await ListingUser.findById(ShopId).select('-Password');
        if (!CheckMyShop) {
            return res.status(404).json({ success: false, msg: "Shop not found" });
        }

        const { Title, Details, HtmlContent, tags } = req.body;

        let listing = await Listing.findById(ListingId);
        if (!listing) {
            return res.status(404).json({ success: false, msg: "Listing not found" });
        }

        if (listing.ShopId.toString() !== ShopId) {
            return res.status(403).json({ success: false, msg: "Unauthorized" });
        }

        // **🔹 Delete Existing Images from Cloudinary**
        if (listing.Items.length > 0) {
            for (let item of listing.Items) {
                if (item.dishImages && item.dishImages.length > 0) {
                    for (let image of item.dishImages) {
                        if (image.public_id) {
                            console.log(`Deleting image: ${image.public_id}`);
                            await Cloudinary.uploader.destroy(image.public_id);
                        }
                    }
                }
            }
        }

        // **🔹 Initialize the Items array**
        const Items = [];
        for (let i = 0; req.body[`Items[${i}].itemName`] !== undefined; i++) {
            Items.push({
                itemName: req.body[`Items[${i}].itemName`],
                MrpPrice: req.body[`Items[${i}].MrpPrice`],
                Discount: req.body[`Items[${i}].Discount`],
                dishImages: []  // Initialize an empty array for dish images
            });
        }

        console.log('Items before adding images:', req.files);

        // Validate request body
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        // **🔹 Handle Image Upload**
        if (req.files && req.files.length > 0) {
            let imageIndex = 0;
            const uploadedDishImages = await Promise.all(req.files.map(upload => uploadImage(upload)));

            uploadedDishImages.forEach((upload) => {
                if (Items[imageIndex]) {
                    Items[imageIndex].dishImages.push({
                        public_id: upload.public_id,
                        ImageUrl: upload.ImageUrl
                    });
                }
                imageIndex++;
            });
        }

        // **🔹 Process Tags Properly**
        const splitTags = tags ? tags.split(',').map(tag => tag.trim()) : [];

        console.log("Updated Tags:", splitTags);

        // **🔹 Update Listing**
        if (Title) listing.Title = Title;
        if (Details) listing.Details = Details;
        if (HtmlContent) listing.HtmlContent = HtmlContent;
        if (splitTags.length > 0) listing.tags = splitTags;
        if (Items.length) listing.Items = Items;

        listing.isApprovedByAdmin = false;

        await listing.save();

        // **🔹 Send Success Response**
        res.status(200).json({
            success: true,
            msg: "Listing updated successfully",
            listing
        });

    } catch (error) {
        console.error("Error updating listing:", error);
        res.status(500).json({ success: false, msg: "Error updating listing", error: error.message });
    }
};


exports.UpdateListingByBolt = async (req, res) => {
    try {
        const listingId = req.query.ListingId;
        const ShopId = req.query.id;

        if (!ShopId) {
            return res.status(401).json({ success: false, msg: "Please Login" });
        }

        // Fetch the existing listing
        const existingListing = await Listing.findOne({ _id: listingId, ShopId });
        if (!existingListing) {
            return res.status(404).json({ success: false, msg: "Listing not found or unauthorized" });
        }

        const { Title, Details, HtmlContent, ItemsUpdated } = req.body;

        // Helper function to upload images to Cloudinary
        const uploadToCloudinary = async (file) => {
            return new Promise((resolve, reject) => {
                Cloudinary.uploader.upload_stream(
                    { folder: "your_upload_folder" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve({ public_id: result.public_id, ImageUrl: result.secure_url });
                    }
                ).end(file.buffer);
            });
        };

        // ✅ Preserve existing items & images
        const updatedItems = JSON.parse(ItemsUpdated || "{}");
        const updatedListingItems = [];

        for (const [index, item] of Object.entries(updatedItems)) {
            const existingItem = existingListing.Items[index] || {}; // Preserve existing item

            let dishImages = existingItem.dishImages || []; // Preserve existing images

            if (req.files && req.files[`dishImages[${index}]`]) {
                const newImages = await Promise.all(req.files[`dishImages[${index}]`].map(uploadToCloudinary));
                dishImages = [...dishImages, ...newImages]; // Append new images to existing ones
            }

            updatedListingItems.push({
                itemName: item.itemName || existingItem.itemName,
                MrpPrice: item.MrpPrice || existingItem.MrpPrice,
                Discount: item.Discount || existingItem.Discount,
                dishImages, // ✅ Keep old images if no new ones are provided
            });
        }

        // ✅ Preserve existing main images
        let updatedPictures = existingListing.Pictures || [];

        if (req.files && req.files.MainImage) {
            const newPictures = await Promise.all(req.files.MainImage.map(uploadToCloudinary));
            updatedPictures = [...updatedPictures, ...newPictures]; // Append new images
        }

        // ✅ Update the listing while preserving images
        const updatedListing = await Listing.findByIdAndUpdate(
            listingId,
            {
                Title: Title || existingListing.Title,
                Details: Details || existingListing.Details,
                HtmlContent: HtmlContent || existingListing.HtmlContent,
                Items: updatedListingItems.length > 0 ? updatedListingItems : existingListing.Items,
                Pictures: updatedPictures.length > 0 ? updatedPictures : existingListing.Pictures, // ✅ Preserve existing images
                updatedAt: Date.now(),
            },
            { new: true, runValidators: true }
        );

        return res.status(200).json({ success: true, msg: "Listing updated successfully", listing: updatedListing });
    } catch (error) {
        console.error("Error during update:", error);
        return res.status(500).json({ success: false, msg: "Error updating listing", error: error.message });
    }
};




exports.updateImage = async (req, res) => {
    try {
        const { publicId } = req.query; // Get publicId of the image to replace
        const imageFile = req.file; // New image file from the request

        // Validate inputs
        if (!publicId || !imageFile) {
            return res.status(400).json({ error: 'Missing required parameters: publicId or image file.' });
        }

        // Find the listing containing the old image
        const listing = await Listing.findOne({
            Pictures: { $elemMatch: { public_id: publicId } }
        });

        if (!listing) {
            return res.status(404).json({ error: 'Image not found in the database.' });
        }

        // Delete old image from Cloudinary
        await Cloudinary.uploader.destroy(publicId, (error, result) => {
            if (error) {
                throw new Error('Failed to delete old image from Cloudinary.');
            }
        });

        // Upload new image to Cloudinary
        const newImage = await uploadImage(imageFile);

        // Update the image details in the database
        const updatedPictures = listing.Pictures.map((picture) =>
            picture.public_id === publicId ? newImage : picture
        );

        listing.Pictures = updatedPictures;
        listing.isApprovedByAdmin = false
        await listing.save();

        res.status(200).json({
            message: 'Image updated successfully!',
            listing,
        });
    } catch (error) {
        console.error('Error updating image:', error.message);
        res.status(500).json({ error: 'An error occurred while updating the image.' });
    }
};



exports.UpdateListingAdmin = async (req, res) => {
    try {
        const ShopId = req.query.id;
        const ListingId = req.query.ListingId;

        if (!ShopId) {
            return res.status(401).json({
                success: false,
                msg: "Please Login",
            });
        }

        const convertInto = new mongoose.Types.ObjectId(ShopId);
        const convertListing = new mongoose.Types.ObjectId(ListingId);

        // Check if shop exists
        const CheckMyShop = await ListingUser.findById(convertInto).select("-Password");
        if (!CheckMyShop) {
            return res.status(404).json({
                success: false,
                msg: "Shop not found",
            });
        }

        const { Title, Details, HtmlContent, tags } = req.body;

        // Find listing by ID
        const listing = await Listing.findById(convertListing);
        if (!listing) {
            return res.status(404).json({
                success: false,
                msg: "Listing not found",
            });
        }

        // Verify the listing belongs to the shop
        if (listing.ShopId.toString() !== ShopId) {
            return res.status(403).json({
                success: false,
                msg: "Unauthorized",
            });
        }




        // Validate the request body
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        // Update only the fields that are modified
        if (Title && Title !== listing.Title) listing.Title = Title;
        if (Details && Details !== listing.Details) listing.Details = Details;
        if (HtmlContent && HtmlContent !== listing.HtmlContent) listing.HtmlContent = HtmlContent;

        if (tags) {
            const splitTags = tags.split(",").map((tag) => tag.trim());
            listing.tags = splitTags;
        }

        // Update items if any changes were made
        if (updatedItems.length) listing.Items = updatedItems;

        // Mark the listing as unapproved
        listing.isApprovedByAdmin = false;

        // Save the updated listing
        await listing.save();

        // Send success response
        res.status(200).json({
            success: true,
            msg: "Listing updated successfully",
            listing,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            msg: "Error updating listing",
            error: error.message,
        });
    }
};


exports.getPostByCategory = async (req, res) => {
    try {
        const { Name } = req.params;
     
        const listings = await ListingUser.find({ ShopCategory: Name });

        if (!listings || listings.length === 0) {
            return res.status(404).json({ message: 'No listings found for this category' });
        }


        const postsPromises = listings.map(async (listing) => {

            const posts = await Listing.find({ ShopId: listing._id, isApprovedByAdmin: true }).sort({ createdAt: -1 });
            const postsWithPlan = posts.map(post => ({
                ...post.toObject(),
                Plan: listing?.ListingPlan
            }));

            return postsWithPlan;
        });


        let postsArrays = await Promise.all(postsPromises);

        let posts = postsArrays.flat();

        const goldPosts = posts.filter(post => post.Plan === 'Gold');
        const silverPosts = posts.filter(post => post.Plan === 'Silver');
        const freePosts = posts.filter(post => post.Plan === 'Free');


        const shuffle = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };


        shuffle(goldPosts);
        shuffle(silverPosts);
        shuffle(freePosts);


        const combinedPosts = [...goldPosts, ...silverPosts, ...freePosts];

        res.status(200).json(posts);
    } catch (error) {
        console.error('Error fetching posts by category:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};