import mongoose, { model, Schema} from "mongoose";

const playlistSchema = new Schema({
    name: {
        type: String,
        required: true
    },

    description: {
        type: String,
    },

    videos: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    }

}, { timestamps : true });

playlistSchema.index({ name: 1, owner: 1 }, { unique: true });

export const Playlist = model("Playlist", playlistSchema);