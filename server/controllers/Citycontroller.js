const City = require('../models/CityModel');
const streamifier = require('streamifier');
const Cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
dotenv.config();

Cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.envCLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY
});

exports.createCity = async (req, res) => {
    try {
        const { cityName } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "Please upload a file" });
        }

        const uploadImage = (file) => {
            return new Promise((resolve, reject) => {
                const stream = Cloudinary.uploader.upload_stream(
                    (error, result) => {
                        if (result) {
                            resolve({ public_id: result.public_id, imageUrl: result.secure_url });
                        } else {
                            reject(error || "Failed to upload image.");
                        }
                    }
                );
                stream.end(file.buffer);
            });
        };

        const { public_id, imageUrl } = await uploadImage(req.file);

        const lastCity = await City.findOne().sort({ position: -1 });
        const lastPosition = lastCity ? lastCity.position : 0;

        const newCity = new City({
            cityName,
            image: {
                url: imageUrl,
                public_id
            },
            position: lastPosition + 1
        });

        const savedCity = await newCity.save();
        res.status(201).json(savedCity);
    } catch (error) {
        console.error('Error creating city:', error);
        res.status(500).json({ error: 'Failed to create city' });
    }
};



exports.updateCity = async (req, res) => {
    try {
        const { id } = req.params;
        const { cityName } = req.body;

        // Find the existing city
        const existingCity = await City.findById(id);
        if (!existingCity) {
            return res.status(404).json({ error: 'City not found' });
        }

        let newImage = existingCity.image; // Keep existing image if not updated
        console.log(req.file)
        // Check if a new file is uploaded
        if (req.file) {
            // Upload new image to Cloudinary
            const uploadImage = (file) => {
                return new Promise((resolve, reject) => {
                    const stream = Cloudinary.uploader.upload_stream(
                        (error, result) => {
                            if (result) {
                                resolve({ public_id: result.public_id, imageUrl: result.secure_url });
                            } else {
                                reject(error || "Failed to upload image.");
                            }
                        }
                    );
                    stream.end(file.buffer);
                });
            };

            const { public_id, imageUrl } = await uploadImage(req.file);

            // Delete old image from Cloudinary if it exists
            if (existingCity.image && existingCity.image.public_id) {
                await Cloudinary.uploader.destroy(existingCity.image.public_id);
            }

            // Update image data
            newImage = { url: imageUrl, public_id };
        }

        // Update city in database
        const updatedCity = await City.findByIdAndUpdate(
            id,
            { cityName, image: newImage },
            {
                new: true, // Return updated document
                runValidators: true // Run Mongoose validators
            }
        );

        res.json(updatedCity);
    } catch (error) {
        console.error('Error updating city:', error);
        res.status(500).json({ error: 'Failed to update city' });
    }
};


exports.deleteCity = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedCity = await City.findById(id);

        if (!deletedCity) {
            return res.status(404).json({ error: 'City not found' });
        }

        if(deletedCity.image && deletedCity.image.public_id) {
            await Cloudinary.uploader.destroy(deletedCity.image.public_id);
        }

        await City.findByIdAndDelete(id);

        res.json(deletedCity);
    } catch (error) {
        console.error('Error deleting city:', error);
        res.status(500).json({ error: 'Failed to delete city' });
    }
};


exports.getAllCities = async (req, res) => {
    try {
        const cities = await City.find({});
        res.json(cities);
    } catch (error) {
        console.error('Error fetching cities:', error);
        res.status(500).json({ error: 'Failed to fetch cities' });
    }
};
