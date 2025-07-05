import mongoose from "mongoose";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {verifyId} from "../utils/verifyId.js";
import {toggleLike} from "../utils/toggleLike.js";
import {Like} from "../models/like.models.js";
import {Video} from "../models/video.models.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    verifyId(videoId);

    const { action, like } = await toggleLike({
        model: Like,
        field: "video",
        value: videoId,
        userId: req.user._id
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            like,
            `Video ${action} successfully`
        )
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    verifyId(commentId);

    const { action, like } = await toggleLike({
        model: Like,
        field: "comment",
        value: commentId,
        userId: req.user._id
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            like,
            `Comment ${action} successfully`
        )
    )
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    verifyId(tweetId);

    const { action, like } = await toggleLike({
        model: Like,
        field: "tweet",
        value: tweetId,
        userId: req.user._id
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            like,
            `Tweet ${action} successfully`
        )
    )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const likes = await Like.find({
        likedBy: req.user._id,
        video: { $ne: null }
    })
    .select("video -_id -comment -tweet -likedBy")
    .sort({createdAt: -1 })
    .limit(100)
    .lean(); // lean for better performance

    if (!likes || likes.length === 0) throw new ApiError(400, "User has no liked videos");
    const videoIds = likes.map(like => like.video);

    const videoList = await Video.aggregate([
        {
            $match: {
                _id: {$in: videoIds.map(id => new mongoose.Types.ObjectId(id))}
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    { $project: { username: 1, fullName: 1 } }
                ]
            }
        },
        { $unwind: "$ownerDetails" },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                isLiked: true,
                owner: "$ownerDetails"
            }
        }
    ]);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videoList,
            "Liked video fetched successfully"
        )
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}