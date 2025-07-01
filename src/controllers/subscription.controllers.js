import mongoose, {isValidObjectId} from "mongoose"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if (!channelId) throw new ApiError(400, "Channel Id not found");
    if (!isValidObjectId(channelId)) throw new ApiError(400, "Invalid channel Id");
    if (req.user._id.toString() === channelId) throw new ApiError(400, "You cannot subscribe to yourself");

    const existingSubscription = await Subscription.findOne({subscriber: req.user?._id, channel: channelId});

    if (existingSubscription) {
        await existingSubscription.deleteOne();
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result,
                "Channel unsubscribed successfully"
            )
        )
    }
    const newSubscription = await Subscription.create({subscriber: req.user?._id,channel: channelId});
    if (!newSubscription) throw new ApiError(500, "Channel subscription process failed");

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            newSubscription,
            "Channel subscribed successfully"
        )
    )
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params;

    if (!channelId) throw new ApiError(400, "Channel Id not found");
    if (!isValidObjectId(channelId)) throw new ApiError(400, "Invalid channel Id");

    if (req.user._id.toString() !== channelId)
        throw new ApiError(403, "You are not allowed to see other's subscriber");

    const subscriberList = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    },
                ]
            }
        },
        {
            $unwind: "$subscriber"
        },
        {
            $project: {
                subscriber: 1
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            subscriberList,
            "Subscriber list fetched successfully"
        )
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!subscriberId) throw new ApiError(400, "Subcriber Id not found");
    if (!isValidObjectId(subscriberId)) throw new ApiError(400, "Invalid subcriber Id");

    if (req.user?._id.toString() !== subscriberId)
        throw new ApiError(403, "You are not allowed to view others subscription list");

    const subscriptionList = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        
        {
            $lookup:{
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline:[
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
            $unwind: "$channel"
        },

        {
            $sort: { createdAt: -1 }
        },
        
        {
            $project: {
                channel: 1,
                subscribedAt: "$createdAt"
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            subscriptionList,
            "Subscribed channels fetched successfully"
        )
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}