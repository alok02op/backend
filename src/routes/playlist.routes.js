import { Router } from 'express';
import {
    addVideoToPlaylist,
    createPlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserPlaylists,
    removeVideoFromPlaylist,
    updatePlaylist,
} from "../controllers/playlist.controller.js"
import {Playlist} from "../models/playlist.models.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import { checkOwnership } from "../middlewares/ownership.middlewares.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(createPlaylist)

router
    .route("/:playlistId")
    .get(getPlaylistById)
    .patch(checkOwnership(Playlist, "playlistId"), updatePlaylist)
    .delete(checkOwnership(Playlist, "playlistId"), deletePlaylist);

router
    .route("/add/:videoId/:playlistId")
    .patch(checkOwnership(Playlist, "playlistId"), addVideoToPlaylist);

router
    .route("/remove/:videoId/:playlistId")
    .patch(checkOwnership(Playlist, "playlistId"), removeVideoFromPlaylist);

router.route("/user/:userId").get(getUserPlaylists);

export default router