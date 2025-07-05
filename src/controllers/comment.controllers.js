import mongoose from "mongoose"
import {Comment} from "../models/comment.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {verifyId} from "../utils/verifyId.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    
    verifyId(videoId);

    let pageNum = Math.max(1, parseInt(page) || 1);
    let limitNum = Math.min(50, Math.max(1, parseInt(limit) || 1));

    const pipeline = [
        { $match: { video: new mongoose.Types.ObjectId(videoId) } },
        { $sort: { createdAt: -1 } },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        { $unwind: "$owner" },
        {
            $project: {
                content: 1,
                createdAt: 1,
                "owner.username": 1,
                "owner.fullName": 1,
                "owner.avatar": 1
            }
        }

    ]

    const result = await Comment.aggregatePaginate(
        Comment.aggregate(pipeline), 
        {
            page: pageNum,
            limit: limitNum
        }
    )

    if (!result.docs || result.docs.length === 0) throw new ApiError(404, "No comments found matching criteria");

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                comments: result.docs,
                total: result.totalDocs,
                page: result.page,
                lastPage: result.totalPages
            },
            "Comments fetched successfully"
        )
    )
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {content} = req.body
    const {videoId} = req.params

    if (!content) throw new ApiError(400, "Comment can't be empty");
    verifyId(videoId)

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id
    })

    if (!comment) throw new ApiError(500, "Something went wrong");
    const populatedComment = await comment.populate("owner", "username fullName avatar");

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            populatedComment,
            "Comment added successfully"
        )
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const comment = req.resource
    const {newContent} = req.body

    if(!newContent) throw new ApiError(400, "Comment can't be empty");
    if (newContent === comment.content) 
        throw new ApiError(400, "newComment should be different from previous one");

    const updatedComment = await Comment.findByIdAndUpdate(
        comment._id,
        {content: newContent, editedAt: new Date()},
        {new: true, validateBeforeSave: false}
    ).populate("owner", "username fullName avatar")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedComment,
            "Comment updated successfully"
        )
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const comment = req.resource

    await comment.deleteOne()

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Comment deleted successfully"
        )
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
