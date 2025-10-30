import { v2 as cloudinary } from 'cloudinary';
// import { response } from 'express'; // This import is not needed in this file
import fs from 'fs';
import dotenv from "dotenv";

dotenv.config();

// Configuration for Cloudinary
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads a file from a local path to Cloudinary.
 * @param {string} localFilePath The absolute path of the file on the local server.
 * @returns {object|null} The Cloudinary upload response object or null if the upload fails.
 */
const uploadOnCloudinary = async (localFilePath) => {
    try {
        // Log to see if a file path is actually being received
        if (!localFilePath) {
            console.log("No local file path was provided. Returning null.");
            return null;
        }

        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(
            localFilePath, {
                resource_type: "auto"
            }
        );
        
        // Log the successful upload and the URL
        console.log("File has been uploaded to Cloudinary successfully. URL:", response.url);
        
        // The file is now on Cloudinary, so we can safely delete it from the server
        fs.unlinkSync(localFilePath);
        
        return response;
    } catch (error) {
        // Log the detailed error from Cloudinary to the console
        console.error("Cloudinary upload failed with an error:", error);
        
        // IMPORTANT: Only delete the file if it actually exists.
        // This prevents an additional error if the file was never created locally.
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        
        return null;
    }
};

/**
 * Deletes a file from Cloudinary using its public ID.
 * @param {string} publicId The public ID of the resource to delete.
 * @returns {object|null} The deletion result or null on failure.
 */
const deleteFromCLoudinary = async (publicId) => {
    try {
        if (!publicId) return null;
        
        const result = await cloudinary.uploader.destroy(publicId);
        
        console.log("File deleted from Cloudinary successfully. Result:", result);
        
        return result;
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
        return null;
    }
};

export { uploadOnCloudinary, deleteFromCLoudinary };