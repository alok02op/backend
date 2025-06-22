import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        
        user.refreshToken = refreshToken;
        user.save({ validateBeforeSave : false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
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
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exist")
    }
    // check for images, check for avatar
    // from multer middleware
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && (req.files.coverImage.length > 0)) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // upload them to cloudinary, avatar
    const avatarResponse = await uploadOnCloudinary(avatarLocalPath);
    const coverImageResponse = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatarResponse) throw new ApiError(400, "Avatar file is required");

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
        new ApiResponse(200, createdUser, "User registered successfully.")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    const {username, email, password} = req.body;
    
    // username or email
    if (!username && !email) throw new ApiError(400, "username or email is required");
    
    // find if the user is not registered
    const user = await User.findOne({
        $or : [{ username }, { email }]
    })
    if (!user) throw new ApiError(404, "User is not registered");

    // password check
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) throw new ApiError(401, "invalid credentials");

    // access and refresh token
    const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(user._id);

    // send cookies
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged In Successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken : undefined
            }
        },
        {
            new : true    // when this is true it returns updated user.
        }
    )
    
    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully"))
})

export { registerUser, loginUser, logoutUser };