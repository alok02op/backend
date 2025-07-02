import mongoose, { model, Schema} from "mongoose";

const likeSchema = new Schema({
    comment: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },

    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },

    tweet: {
        type: Schema.Types.ObjectId,
        ref: "Tweet"
    },

    likedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }

}, { timestamps : true });

// Ensure uniqueness per user per resource
likeSchema.index({ comment: 1, likedBy: 1 }, { unique: true, sparse: true });
likeSchema.index({ video: 1, likedBy: 1 }, { unique: true, sparse: true });
likeSchema.index({ tweet: 1, likedBy: 1 }, { unique: true, sparse: true });

export const Like = model("Like", likeSchema);