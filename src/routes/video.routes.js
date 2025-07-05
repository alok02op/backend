import { Router } from 'express';
import {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
} from "../controllers/video.controllers.js"
import {verifyJWT} from "../middlewares/auth.middlewares.js"
import {upload} from "../middlewares/multer.middlewares.js"
import { checkOwnership } from "../middlewares/ownership.middlewares.js"
import { Video } from "../models/video.models.js"
 
const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
    .route("/")
    .get(getAllVideos)
    .post(
        upload.fields([
            {
                name: "thumbnail",
                maxCount: 1
            },
            {
                name: "video",
                maxCount: 1
            }
        ]),
        publishAVideo
    );

router
    .route("/:videoId")
    .get(getVideoById)
    .delete(checkOwnership(Video, "videoId"), deleteVideo)
    .patch(checkOwnership(Video, "videoId") , upload.single("thumbnail"), updateVideo);

router.route("/toggle/publish/:videoId").patch(checkOwnership(Video, "videoId"), togglePublishStatus);

export default router