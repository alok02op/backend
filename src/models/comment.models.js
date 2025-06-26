import mongoose, { model, Schema} from "mongoose";

const commentSchema = new Schema({
    content: {
        type: String,
        required: true
    },

    videos: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],

    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }

}, { timestamps : true });

export const Comment = model("Comment", commentSchema);