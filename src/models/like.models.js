import mongoose, { model, Schema} from "mongoose";

const likeSchema = new Schema({
    comment: [
        {
            type: Schema.Types.ObjectId,
            ref: "Comment"
        }
    ],

    videos: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],

    tweet: [
        {
            type: Schema.Types.ObjectId,
            ref: "Tweet"
        }
    ],

    likedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }

}, { timestamps : true });

export const Like = model("Like", likeSchema);