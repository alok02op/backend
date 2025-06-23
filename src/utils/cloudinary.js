import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
    api_key : process.env.CLOUDINARY_API_KEY,
    api_secret : process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        // upload the file on cloudinary
        const reponse = await cloudinary.uploader.upload(localFilePath, {
            resource_type : "auto"
        })
        // file has been uploaded successfull
        fs.unlinkSync(localFilePath);
        return reponse;
    } catch (error) {
        fs.unlinkSync(localFilePath); // removed the locally saved temprary file
        console.log("Error in uploading on cloudinary ", error);
        return null
    }
}

const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null
        // delete the file from cloudinary
        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type : "auto"
        })
        return response;
    } catch (error) {
        console.log("Error in deleting from cloudinary ", error);
        return null
    }
}

export {uploadOnCloudinary, deleteFromCloudinary}