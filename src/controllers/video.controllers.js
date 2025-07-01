import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    let pageNum = parseInt(page)
    let limitNum = parseInt(limit)
    
    if (pageNum < 1 || limitNum < 1) {
        throw new ApiError(400, "Page and limit must be greater than 0")
    }

    const filter = {}
    
    if (query) {
        filter.$or = [
            { title: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } }
        ]
    }
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid user ID")
        }
        const user = await User.findById(userId)
        if (!user) {
            throw new ApiError(404, "User not found")
        }
        filter.owner = userId
    }

    const sortOptions = {}
    if (sortBy) {
        sortOptions[sortBy] = sortType === 'asc' ? 1 : -1
    }

    const result = await Video.paginate(filter, {
        page: pageNum,
        limit: limitNum,
        sort: sortOptions
    })

    if (!result.docs || result.docs.length === 0) {
        throw new ApiError(404, "No videos found matching the criteria")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            {
                videos: result.docs,
                total: result.totalDocs,
                page: result.page,
                lastPage: result.totalPages
            },
            "Videos fetched successfully"
        )
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    const localPathVideo = req.files?.video[0]?.path;
    const localPathThumbnail = req.files?.thumbnail[0]?.path;

    if (!localPathVideo || !localPathThumbnail) {
        throw new ApiError(400, "video file and thumbnail, both are required");
    }

    const responseThumbnail = await uploadOnCloudinary(localPathThumbnail);
    const responseVideo = await uploadOnCloudinary(localPathVideo);

    if (!responseThumbnail || !responseVideo) {
        throw new ApiError(500, "failed during uploading on cloudinary");
    }

    const video = await Video.create({
        videoFile: responseVideo?.url,
        thumbnail: responseThumbnail?.url,
        title,
        description,
        duration: responseVideo?.duration,
        isPublished: true,
        owner: req.user?._id
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video published successfully"
        )
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if (!videoId) {
        throw new ApiError(400, "Video id is not provided")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    await Video.findByIdAndUpdate(
        videoId,
        { $inc: { views: 1 } }
    )

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            fullName: 1,
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "owner",
                foreignField: "channel",
                as: "subscriber"
            }
        },

        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "videos",
                as: "likes",
            }
        },
        
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                subCount: {$size: "$subscriber"},
                likesCount: {$size: "$likes"},
                owner: {$first : "$ownerDetails"},
            }
        }
    ])

    if (!video || video.length === 0) {
        throw new ApiError(404, "Video not found")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video[0],
            "Video fetched successfully"
        )
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail
    const video = req.resource;
    const { title, description } = req.body
    let localPathThumbnail;
    if (req.file) {
        localPathThumbnail = req.file.path;
    }
    const responseThumbnail = localPathThumbnail ? await uploadOnCloudinary(localPathThumbnail) : null;
    if (localPathThumbnail && !responseThumbnail) throw new ApiError(500, "Thumbnail upload failed");

    if (responseThumbnail && video.thumbnail) {
        await deleteFromCloudinary(video.thumbnail);
    }

    if (title) video.title = title;
    if (description) video.description = description;
    if (responseThumbnail) video.thumbnail = responseThumbnail.url;

    await video.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video updated successfully"
        )
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const video = req.resource;

    if (video.videoFile) await deleteFromCloudinary(video.videoFile);
    if (video.thumbnail) await deleteFromCloudinary(video.thumbnail);

    await video.deleteOne();

    return res
    .status(200)
    .json(
        new ApiResponse(200, video, "Video deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const video = req.resource;

    video.isPublished = !video.isPublished;
    await video.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            `Video ${video.isPublished ? "published" : "unpublished"} successfully`
        )
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
