const Categories = require('../models/CategoreiesModel');
const Cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const ListingUser = require('../models/User.model');
const ListingData = require('../models/listing.model');
const result = dotenv.config();

if (result.error) {
  console.error(result.error);
  throw new Error('Failed to load environment variables');
}


Cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY
});

const uploadImage = (file) => {
  return new Promise((resolve, reject) => {
    const stream = Cloudinary.uploader.upload_stream((error, result) => {
      if (result) {
        resolve({ public_id: result.public_id, imageUrl: result.secure_url });
      } else {
        reject(error || "Failed to upload image");
      }
    });
    stream.end(file.buffer);
  });
};



// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { CategoriesName } = req.body;

    // Check if CategoriesName is provided
    if (!CategoriesName) {
      return res.status(400).json({
        success: false,
        msg: "Please fill in all fields"
      });
    }

    // Check if file is uploaded
    const uploadImage = (file) => {
      return new Promise((resolve, reject) => {
        const stream = Cloudinary.uploader.upload_stream((error, result) => {
          if (result) {
            resolve({ public_id: result.public_id, imageUrl: result.secure_url });
          } else {
            reject(error || "Failed to upload image");
          }
        });
        stream.end(file.buffer);
      });
    };
    console.log("Uplaod Image", uploadImage)
    // Assuming req.files contains uploaded files, adjust if using a different middleware
    const uploadedImages = await Promise.all(req.files.map(file => uploadImage(file)));
    console.log("Uplaod Images", uploadedImages)
    // Create new category object
    const newCategory = new Categories({
      CategoriesName,
      CategoriesImage: {
        imageUrl: uploadedImages[0].imageUrl,
        public_id: uploadedImages[0].public_id
      }// Assuming you want to store multiple images
    });

    // Save category to database
    const savedCategory = await newCategory.save();

    console.log("savedCategory", savedCategory)

    // Respond with success message and saved category data
    res.status(201).json({
      success: true,
      data: savedCategory
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

const uploadImages = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = Cloudinary.uploader.upload_stream((error, result) => {
      if (result) {
        resolve({ public_id: result.public_id, imageUrl: result.secure_url })
      } else {
        reject(error || "Failed to upload image")
      }
    })
    stream.end(fileBuffer)
  })
}

exports.updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { CategoriesName } = req.body;
    const file = req.files?.[0]; // Ensure req.files exists

    // Validate required fields
    if (!CategoriesName) {
      return res.status(400).json({
        success: false,
        msg: "Please provide a category name"
      });
    }

    // Find category by ID
    let category = await Categories.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        msg: "Category not found"
      });
    }

    // Upload new image if file is provided
    let uploadedImage = {};
    if (file) {
      uploadedImage = await uploadImages(file.buffer);
    }

    // Delete existing image from Cloudinary if it exists
    if (category.CategoriesImage?.public_id) {
      console.log("Deleting existing image...");
      const result = await Cloudinary.uploader.destroy(category.CategoriesImage.public_id);

      if (result.result !== "ok") {
        console.warn("Failed to delete previous image from Cloudinary.");
      }
    }

    // Update category fields
    category.CategoriesName = CategoriesName;

    if (file) {
      category.CategoriesImage = {
        imageUrl: uploadedImage.imageUrl,
        public_id: uploadedImage.public_id
      };
    }

    // Save updated category
    const updatedCategory = await category.save();

    // Respond with success message and updated category data
    res.status(200).json({
      success: true,
      msg: "Category updated successfully",
      data: updatedCategory
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ success: false, msg: "Failed to update category" });
  }
};


// Delete a category by ID
exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id; // Assuming ID is passed in URL params

    // Find category by ID and delete it
    const deletedCategory = await Categories.findById(categoryId);

    if (!deletedCategory) {
      return res.status(404).json({
        success: false,
        msg: "Category not found"
      });
    }
    await deletedCategory.deleteOne()

    // Respond with success message and deleted category data
    res.status(200).json({
      success: true,
      data: deletedCategory
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};


exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Categories.find()
    const listings = await ListingUser.find()


    const postsPromises = listings.map(async (listing) => {
      const posts = await ListingData.find({ ShopId: listing._id, isApprovedByAdmin: true }).sort({ createdAt: -1 }).populate('ShopId');

      const postsWithPlan = posts.map(post => ({
        ...post.toObject(),
        Plan: listing?.ListingPlan
      }));

      return postsWithPlan;
    });

    const postsArrays = await Promise.all(postsPromises);
    const posts = postsArrays.flat();

    // Find categories with at least one approved post
    const categoriesWithPosts = categories.filter(category =>
      posts.some(post => post.ShopId?.ShopCategory.toString() === category._id.toString())
    );


    res.status(200).json({
      success: true,
      data: categoriesWithPosts
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

exports.getAllCategoryAdmin = async (req, res) => {
  try {
    const allCategory = await Categories.find()
    if (!allCategory) {
      return res.status(404).json({
        success: false,
        message: "No categories found"
      })
    }
    res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: allCategory
    })
  } catch (error) {
    console.log("Internal server error", error)
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
}