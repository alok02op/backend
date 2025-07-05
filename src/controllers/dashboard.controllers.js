import mongoose from "mongoose"
import {Video} from "../models/video.models.js"
import {Subscription} from "../models/subscription.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const stats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            }
        },
        {
            $group: {
                _id: null,
                totalVideos: { $sum: 1 },
                totalViews: { $sum: "$views" },
                totalLikes: { $sum: { $size: "$likes" } },
                averageVideoDuration: { $avg: "$duration" },
                averageViewsPerVideo: { $avg: "$views" },
                lastUploadDate: { $first: "$createdAt" }
            }
        },
        {
            $project: {
                _id: 0,
                totalVideos: 1,
                totalViews: 1,
                totalLikes: 1,
                averageVideoDuration: 1,
                averageViewsPerVideo: 1
            }
        }
    ])

    const totalSubscribers = await Subscription.countDocuments({channel: req.user._id});

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                ...(stats[0] || {
                    totalVideos: 0,
                    totalViews: 0,
                    totalLikes: 0,
                    averageVideoDuration: 0,
                    averageViewsPerVideo: 0
                }),
                totalSubscribers
            },
            "Channel stats fetched successfully"
        )
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const videoList = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user._id)
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
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        { $unwind: "$ownerDetails"},
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                owner: "$ownerDetails"
            }
        }
    ])

    if (!videoList || videoList.length === 0) throw new ApiError(404, "No videos found");

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videoList,
            "Channel videos fetched successfully"
        )
    )
})

export {
    getChannelStats, 
    getChannelVideos
}