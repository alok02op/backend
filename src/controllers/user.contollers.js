import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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
        new ApiResponse(201, createdUser, "User registered successfully.")
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
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset : {
                refreshToken : 1
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

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Access");
    }
    
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id);
    
        if (!user) new ApiError(401, "Invalid Refresh Token");
        if (user.refreshToken !== incomingRefreshToken) new ApiError(401, "refresh token is expired or used");
    
        const { newRefreshToken, accessToken } = await generateAccessAndRefreshTokens(user._id);
    
        const options = {
            httpOnly : true,
            secure : true
        }
    
        return res
        .status(200)
        .cookie("Access Token ", accessToken, options)
        .cookie("Refresh Token ", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, newRefreshToken},
                "Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token");
    }
})

const changeCurrentPassword = asyncHandler(async (req,res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new ApiError(400, "Current password and new password are required");
    }

    const user = await User.findById(req.user?._id);
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(currentPassword);
    
    if (!isPasswordValid) {
        throw new ApiError(401, "Current password is incorrect");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            {}, 
            "Password changed successfully"
        )
    );
})

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "wacthHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $adddFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]

            }
        },
        {
            $project: {
                username: 1,
                email: 1,
                fullName: 1,
                avatar: 1,
                coverImage: 1,
                watchHistory: 1
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Current user fetched successfully"
        )
    );
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, username, email } = req.body

    // Validate request data
    if (!fullName || !username || !email) {
        throw new ApiError(400, "All fields are required");
    }

    // Update user details
    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        { 
            $set: { 
                fullName, 
                username, 
                email 
            }
        },
        { new: true, runValidators: true }
    ).select("-password -refreshToken");

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedUser,
            "Account details updated successfully"
        )
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(500, "Failed to upload avatar on cloudinary");
    }
    
    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { avatar: avatar.url } },
        { new: true }
    ).select("-password -refreshToken");
    
    await deleteFromCloudinary(req.user?.avatar);
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedUser,
                "User avatar updated successfully"
            )
        );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) throw new ApiError(400, "cover image file is missing");

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage) throw new ApiError(500, "failed to upload on cloudinary");

    await deleteFromCloudinary(req.user?.coverImage);

    const updatedUser = await findByIdAndUpdate(
        req.user?._id,
        { $set: { coverImage : coverImage.url } },
        { new: true, runValidators: true }
    ).select("-password -refreshToken");

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedUser,
            "Cover image updated successfully"
        )
    );
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params

    if (!username?.trim()) throw new ApiError(400, "Username is missing");
    
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                email: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "Channel Does Not Exist");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            channel[0],
            "User channel fetched successfully"
        )
    )
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        },
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "User watch history fetched successfully"
        )
    )
})

export { 
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};