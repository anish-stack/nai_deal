import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Save, Trash2, ImageIcon, Upload, X } from 'lucide-react';
import { fetchPost, updatePost } from './api';
import imagesEdit from './edit.png';
import { validateForm } from './validateForm';
import JoditEditor from 'jodit-react';
import CreatableSelect from "react-select/creatable";

const EditPost = () => {
  const query = new URLSearchParams(window.location.search);
  const id = query.get('id');

  const [formData, setFormData] = useState({
    Title: '',
    Details: '',
    tags: [],
    HtmlContent: '',
    Items: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [imagePreviewUrls, setImagePreviewUrls] = useState({});
  const [originalData, setOriginalData] = useState(null); // Store original data

  const editor = useRef(null);
  const config = useMemo(() => ({
    readonly: false,
  }), []);

  // Load Post Data if ID Exists
  useEffect(() => {
    const loadPost = async () => {
      try {
        const post = await fetchPost(id);
        if (post) {
          // Store the original data
          setOriginalData(post);
          
          setFormData({
            Title: post.Title,
            Details: post.Details,
            HtmlContent: post.HtmlContent,
            tags: post.tags || [],
            Items: post.Items.map(item => ({
              ...item,
              dishImages: item.dishImages || [] // Ensure dishImages exists
            })) || [],
          });
        } else {
          setError("Post not found");
        }
      } catch (err) {
        console.error(err);
        setError(err?.message || "Failed to load post");
      } finally {
        setLoading(false);
      }
    };

    if (id) loadPost();
    else setLoading(false);
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleTagsChange = (selectedOptions) => {
    const tagsArray = selectedOptions.map((option) => option.value);
    setFormData((prev) => ({ ...prev, tags: tagsArray }));
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const updatedItems = formData.Items.map((item, i) =>
      i === index ? { ...item, [name]: value } : item
    );
    setFormData(prev => ({ ...prev, Items: updatedItems }));
    setFormErrors(prev => ({ ...prev, [`item${index}`]: '' }));
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      Items: [...prev.Items, { itemName: '', Discount: '', MrpPrice: '', dishImages: [] }]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      Items: prev.Items.filter((_, i) => i !== index)
    }));

    setImagePreviewUrls(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[`item-${index}`];
      return newPreviews;
    });
  };

  const handleImageChange = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrls(prev => ({
      ...prev,
      [`item-${index}`]: previewUrl
    }));

    const updatedItems = [...formData.Items];
    if (!updatedItems[index].dishImages) {
      updatedItems[index].dishImages = [];
    }

    // Add new image while preserving existing ones
    updatedItems[index].dishImages.push({
      file,
      ImageUrl: previewUrl,
      isNew: true
    });

    setFormData(prev => ({ ...prev, Items: updatedItems }));
  };

  const handleRemoveImage = (itemIndex, imageIndex) => {
    const updatedItems = [...formData.Items];
    updatedItems[itemIndex].dishImages = updatedItems[itemIndex].dishImages.filter((_, i) => i !== imageIndex);

    setFormData(prev => ({ ...prev, Items: updatedItems }));

    if (imagePreviewUrls[`item-${itemIndex}`]) {
      setImagePreviewUrls(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[`item-${itemIndex}`];
        return newPreviews;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm(formData);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    const formDataToSubmit = new FormData();

    // Append basic fields
    formDataToSubmit.append('Title', formData.Title || originalData.Title);
    formDataToSubmit.append('Details', formData.Details || originalData.Details);

    // Append items and their images
    formData.Items.forEach((item, index) => {
      const originalItem = originalData?.Items[index] || {};
      
      // Use new values or fall back to original values
      formDataToSubmit.append(`Items[${index}].itemName`, item.itemName || originalItem.itemName || '');
      formDataToSubmit.append(`Items[${index}].Discount`, item.Discount || originalItem.Discount || '');
      formDataToSubmit.append(`Items[${index}].MrpPrice`, item.MrpPrice || originalItem.MrpPrice || '');

      // Handle images
      if (item.dishImages && item.dishImages.length > 0) {
        item.dishImages.forEach((dishImage) => {
          // If it's an existing image, preserve its data
          if (dishImage.public_id) {
            formDataToSubmit.append(`Items[${index}].existingImages`, JSON.stringify({
              public_id: dishImage.public_id,
              ImageUrl: dishImage.ImageUrl
            }));
          }
          // If it's a new image, append the file
          if (dishImage.file) {
            formDataToSubmit.append('dishImage', dishImage.file);
            formDataToSubmit.append(`Items[${index}].newImageIndices`, dishImage.isNew ? 'true' : 'false');
          }
        });
      } else if (originalItem.dishImages) {
        // If no new images, preserve original images
        originalItem.dishImages.forEach((originalImage) => {
          formDataToSubmit.append(`Items[${index}].existingImages`, JSON.stringify({
            public_id: originalImage.public_id,
            ImageUrl: originalImage.ImageUrl
          }));
        });
      }
    });

    // Preserve tags
    const tagsToSubmit = formData.tags.length > 0 ? formData.tags : originalData.tags || [];
    formDataToSubmit.append('tags', tagsToSubmit.join(','));

    // Preserve HTML content
    formDataToSubmit.append('HtmlContent', formData.HtmlContent || originalData.HtmlContent || '');

    try {
      const data = await updatePost(id, formDataToSubmit);
      console.log('Post updated successfully:', data);
      alert('Post updated successfully!');
    } catch (err) {
      console.error('Error updating post:', err.message);
      setError(err.message || 'Failed to update post');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Error: {error}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 py-6 px-8">
            <h2 className="text-3xl font-bold text-white">Edit Your Post</h2>
            <p className="text-blue-100 mt-2">Update your post information and media</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Basic Info */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-lg font-semibold text-gray-800">Post Title</span>
                    <input
                      type="text"
                      name="Title"
                      value={formData.Title}
                      onChange={handleInputChange}
                      className={`mt-1 w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.Title ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter post title"
                    />
                    {formErrors.Title && (
                      <p className="mt-1 text-red-500 text-sm">{formErrors.Title}</p>
                    )}
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="block">
                    <span className="text-lg font-semibold text-gray-800">Tags</span>
                    <div className="text-xs text-gray-500 mb-1">
                      Write tags or create new ones (e.g., #first, #second)
                    </div>
                    <CreatableSelect
                      isMulti
                      value={formData.tags.map((tag) => ({ value: tag, label: tag }))}
                      onChange={handleTagsChange}
                      placeholder="Enter or select tags"
                      className="mt-1 block w-full"
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="block">
                    <span className="text-lg font-semibold text-gray-800">HTML Content</span>
                    <JoditEditor
                      ref={editor}
                      value={formData.HtmlContent}
                      config={config}
                      tabIndex={1}
                      onBlur={newContent => setFormData(prev => ({ ...prev, HtmlContent: newContent }))}
                      onChange={(content) => setFormData(prev => ({ ...prev, HtmlContent: content }))}
                    />
                  </label>
                </div>
              </div>

              {/* Right Column - Items */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-800">Product Items</h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                  {formData.Items.map((item, index) => (
                    <div key={index} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Item {index + 1}</h3>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title="Remove Item"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block">
                            <span className="text-sm font-semibold text-gray-800">Item Name</span>
                            <input
                              type="text"
                              name="itemName"
                              value={item.itemName}
                              onChange={(e) => handleItemChange(index, e)}
                              className={`mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors[`item${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="Enter item name"
                            />
                          </label>
                        </div>

                        <div>
                          <label className="block">
                            <span className="text-sm font-semibold text-gray-800">Item Price</span>
                            <input
                              type="number"
                              name="MrpPrice"
                              value={item.MrpPrice}
                              onChange={(e) => handleItemChange(index, e)}
                              className={`mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors[`item${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="Enter item price"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block">
                          <span className="text-sm font-semibold text-gray-800">Discount (%)</span>
                          <input
                            type="number"
                            name="Discount"
                            value={item.Discount}
                            onChange={(e) => handleItemChange(index, e)}
                            className={`mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors[`item${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="Enter discount percentage"
                          />
                        </label>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-800">Item Images</span>
                          <label className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 cursor-pointer transition-colors">
                            <Upload className="w-4 h-4" />
                            <span>Upload Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(index, e)}
                              className="hidden"
                            />
                          </label>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                          {item.dishImages && item.dishImages.map((image, imgIndex) => (
                            <div key={`${index}-${imgIndex}`} className="relative group">
                              <img
                                src={image.ImageUrl || "https://via.placeholder.com/150"}
                                className="object-cover w-full h-24 rounded-lg border border-gray-200"
                                alt={`Item ${index + 1} - Image ${imgIndex + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(index, imgIndex)}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove Image"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              {image.isNew && (
                                <span className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                                  New
                                </span>
                              )}
                            </div>
                          ))}

                          {imagePreviewUrls[`item-${index}`] && !item.dishImages.some(img => img.ImageUrl === imagePreviewUrls[`item-${index}`]) && (
                            <div className="relative group">
                              <img
                                src={imagePreviewUrls[`item-${index}`]}
                                className="object-cover w-full h-24 rounded-lg border border-gray-200"
                                alt={`New preview for item ${index + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setImagePreviewUrls(prev => {
                                    const newPreviews = { ...prev };
                                    delete newPreviews[`item-${index}`];
                                    return newPreviews;
                                  });
                                }}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove Preview"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <span className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                                Preview
                              </span>
                            </div>
                          )}

                          {(!item.dishImages || item.dishImages.length === 0) && !imagePreviewUrls[`item-${index}`] && (
                            <div className="flex items-center justify-center w-full h-24 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                              <div className="text-center text-gray-400">
                                <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                                <span className="text-xs">No images</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {formData.Items.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500">No items added yet</p>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add Your First Item
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditPost;