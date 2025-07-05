import {Playlist} from "../models/playlist.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {verifyId} from "../utils/verifyId.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    //TODO: create playlist
    if (!name || typeof name !== 'string' || name.trim() === "") {
        throw new ApiError(400, "Playlist name is required and must be a non-empty string.");
    }

    try {
        const playlist = await Playlist.create(
            {
                name: name.trim(),
                description: description?.trim(),
                videos: [],
                owner: req.user._id
            }
        )
    
        const populatedPlaylist = await playlist.populate("owner", "username fullName avatar");
    
        return res.status(201).json(
            new ApiResponse(201, populatedPlaylist, "Playlist created successfully")
        );
    } catch (error) {
        if (error.code === 11000) {
            throw new ApiError(409, "You already have a playlist with this name.");
        }
        throw error;
    }
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    verifyId(userId);

    const playlist = await Playlist.find({owner: userId}).populate("owner", "username fullName avatar");
    if (!playlist || playlist.length === 0) throw new ApiError(404, "No playlist found");

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            playlist,
            "Playlists fectched successfully"
        )
    )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    verifyId(playlistId)

    const playlist = await Playlist.findById(playlistId).populate("owner", "username fullName avatar");
    if (!playlist) throw new ApiError(404, "Playlist not found");

    return res.status(200).json(
        new ApiResponse(200, playlist, "Playlist fetched successfully")
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const playlistId = req.resource._id

    verifyId(videoId);

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: {
                videos: videoId
            }
        },
        {
            new: true,
            validateBeforeSave: false
        }
    )

    if (!playlist) throw new ApiError(404, "Playlist not found");

    return res.status(200).json(
        new ApiResponse(200, playlist, "Video added to playlist successfully")
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    // TODO: remove video from playlist
    const playlist = req.resource

    verifyId(videoId);
    const isPresent = playlist.videos.includes(videoId);

    if (!isPresent) throw new ApiError(400, "Video is not in the playlist");


    playlist.videos.pull(videoId);
    await playlist.save({validateBeforeSave: false});

    return res.status(200).json(
        new ApiResponse(200, playlist, "Video removed from playlist successfully")
    )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    // TODO: delete playlist
    const playlist = req.resource;
    await playlist.deleteOne();

    return res.status(200).json(
        new ApiResponse(200, playlist, "Playlist deleted successfully")
    );
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    const playlistId = req.resource._id
    //TODO: update playlist

    if (!name || typeof name !== 'string' || name.trim() === "") {
        throw new ApiError(400, "Playlist name is required and must be a non-empty string.");
    }

    const existing = await Playlist.findOne({
        owner: req.user._id,
        name: name.trim(),
        _id: { $ne: playlistId } // ignore current playlist
    });

    if (existing) {
        throw new ApiError(409, "You already have a playlist with this name.");
    }

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name: name.trim(),
                description: description?.trim()
            }
        },
        {
            new: true,
            validateBeforeSave: false
        }
    )
    if (!playlist) throw new ApiError(404, "Playlist not found");

    return res.status(200).json(
        new ApiResponse(200, playlist, "Playlist updated successfully")
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
