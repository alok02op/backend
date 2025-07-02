import { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body
    if (!content || content.trim() === "") throw new ApiError(400, "Content required");

    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    })

    if (!tweet) throw new ApiError(500, "Failed during tweet creation");

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            tweet,
            "Tweet created successfully"
        )
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const user_id = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!user_id) throw new ApiError(400, "User id is missing");
    if (!isValidObjectId(user_id)) throw new ApiError(400, "Invalid user id");

    let pageNum = Math.max(1, parseInt(page) || 1);
    let limitNum = Math.min(50, Math.max(1, parseInt(limit) || 1)); 

    const result = await Tweet.paginate(
        {
            owner: user_id
        },
        {
            page: pageNum,
            limit: limitNum,
            sort: {createdAt: -1},
            populate: {
                path: "owner",
                select: "username email fullName avatar"
            }
        }
    );

    if (!result.docs || result.docs.length === 0) {
        throw new ApiError(404, "No tweets found matching the criteria")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                tweets: result.docs,
                total: result.totalDocs,
                page: result.page,
                lastPage: result.totalPages
            },
            "User tweets fetched successfully"
        )
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { newContent } = req.body;
    const tweet = req.resource;

    if (!newContent) throw new ApiError(400, "newContent is required");
    if (tweet.content === newContent) throw new ApiError(400, "New content is identical to existing content");

    tweet.content = newContent;
    await tweet.save({validateBeforeSave: false});

    const updatedTweet = await Tweet
    .findOne({_id: tweet._id})
    .populate({path: "owner", select: "username email fullName avatar"});

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedTweet,
            "Tweet updated successfully"
        )
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const tweet = req.resource;

    await tweet.deleteOne();

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            null,
            "Tweet deleted successfully"
        )
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
