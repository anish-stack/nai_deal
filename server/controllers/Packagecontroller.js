const Package = require('../models/Pacakge');

exports.createPackage = async (req, res) => {
    try {
        const { packageName, packagePrice, postsDone, validity } = req.body;

        if (!validity || validity <= 0) {
            return res.status(400).json({ success: false, message: 'Validity must be a positive number' });
        }

        // Calculate expiry date based on validity (days)
        const expiryDate = new Date(Date.now() + validity * 24 * 60 * 60 * 1000);

        // Create a new package instance
        const newPackage = new Package({
            packageName,
            packagePrice,
            postsDone,
            validity,
            expiryDate // Set expiry date manually
        });

        // Save the package to the database
        const savedPackage = await newPackage.save();

        return res.status(201).json({ success: true, package: savedPackage });
    } catch (error) {
        console.error('Error creating package:', error);
        return res.status(500).json({ success: false, message: 'Failed to create package' });
    }
};
exports.updatePackage = async (req, res) => {
    try {
        const { packageName, packagePrice, postsDone, validity } = req.body; // Added validity field
        const packageId = req.params.id;

        // Find the package by ID and update its fields
        const updatedPackage = await Package.findByIdAndUpdate(
            packageId,
            {
                packageName,
                packagePrice,
                postsDone,
                validity // Updating validity
            },
            { new: true } // { new: true } ensures we get the updated package back
        );

        if (!updatedPackage) {
            return res.status(404).json({ success: false, message: 'Package not found' });
        }

        return res.status(200).json({ success: true, package: updatedPackage });
    } catch (error) {
        console.error('Error updating package:', error);
        return res.status(500).json({ success: false, message: 'Failed to update package' });
    }
};


exports.deletePackage = async (req, res) => {
    try {
        const packageId = req.params.id;

        // Find the package by ID and delete it
        const deletedPackage = await Package.findByIdAndDelete(packageId);

        if (!deletedPackage) {
            return res.status(404).json({ success: false, message: 'Package not found' });
        }

        return res.status(200).json({ success: true, message: 'Package deleted successfully' });
    } catch (error) {
        console.error('Error deleting package:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete package' });
    }
};

exports.getAllPackages = async (req, res) => {
    try {
        // Fetch all packages from the database
        const packages = await Package.find();

        return res.status(200).json({ success: true, packages });
    } catch (error) {
        console.error('Error fetching packages:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch packages' });
    }
};
