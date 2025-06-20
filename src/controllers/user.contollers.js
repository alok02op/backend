import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}


const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    const { fullName, email, username, password } = req.body
    
    // validation - not empty
    // if (fullName === "") throw new ApiError(400, "fullName is required")

    if (
        [fullName, email, username, password].some((field) => (field?.trim() === ""))
    ) {
        throw new ApiError(400, "Please fill all the required fields");
    }
    if (username !== username.toLowerCase()) {
        throw new ApiError(400, "username should contain only lowercase alphabets and digits");
    }
    if (!isValidEmail(email)) {
        throw new ApiError(400, "Please enter valid email address");
    }

    // check if already exist : username, email
    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exist")
    }
    // check for images, check for avatar
    // from multer middleware
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }
    // upload them to cloudinary, avatar
    const avatarResponse = await uploadOnCloudinary(avatarLocalPath);
    const coverImageResponse = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatarURL) throw new ApiError(400, "Avatar file is required");

    // create user object - create entry in db
    const user = await User.create({
        fullName,
        username,
        email : email.toLowerCase(),
        avatar : avatarResponse.url,
        coverImage : coverImageResponse?.url || "",
        password
    })
    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"     // - sign means remove.
    );

    // check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user.");
    }
    // return response
    return res.status(201).json(
        ApiResponse(200, createdUser, "User registered successfully.")
    )
})
export {registerUser};