"use client"

import { useState, useRef } from "react"
import { Image, Share, X } from "lucide-react"
import { toast } from "react-hot-toast" // Import toast

const ImageShare = () => {
  const [selectedImage, setSelectedImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const fileInputRef = useRef(null)
  const [shareText, setShareText] = useState("")
  const [shareTitle, setShareTitle] = useState("")

  const handleImageSelect = (event) => {
    const file = event.target.files[0]
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file)
      const imageUrl = URL.createObjectURL(file)
      setPreviewUrl(imageUrl)
    }
  }

  const clearImage = () => {
    setSelectedImage(null)
    setPreviewUrl("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleShare = async () => {
    try {
      if (!navigator.share) {
        throw new Error("Web Share API is not supported in your browser")
      }

      const shareData = {
        title: shareTitle || "Check this out!",
        text: shareText || "I wanted to share this with you",
      }

      if (selectedImage) {
        const files = [new File([selectedImage], selectedImage.name, { type: selectedImage.type })]
        shareData.files = files
      }

      await navigator.share(shareData)
      toast.success("Shared successfully!")
    } catch (error) {
      if (error.name === "AbortError") {
        toast.info("Share operation was cancelled")
      } else {
        toast.error(error.message || "Failed to share")
      }
      console.error("Error sharing:", error)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Share Content</h2>

      {/* Title Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Share Title</label>
        <input
          type="text"
          value={shareTitle}
          onChange={(e) => setShareTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter title..."
        />
      </div>

      {/* Text Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Share Text</label>
        <textarea
          value={shareText}
          onChange={(e) => setShareText(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
          placeholder="Enter text to share..."
        />
      </div>

      {/* Image Upload */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Image</label>
        <div className="relative">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
          >
            <Image className="w-5 h-5 mr-2" />
            Choose Image
          </label>
        </div>
      </div>

      {/* Image Preview */}
      {previewUrl && (
        <div className="relative mb-4">
          <div className="relative w-full h-48 rounded-lg overflow-hidden">
            <img src={previewUrl || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Share Button */}
      <button
        onClick={handleShare}
        className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <Share className="w-5 h-5 mr-2" />
        Share
      </button>

      {/* Fallback Message */}
      {!navigator.share && (
        <p className="mt-4 text-sm text-red-500">
          Web Share API is not supported in your browser. Please try using a modern mobile browser.
        </p>
      )}
    </div>
  )
}

export default ImageShare

