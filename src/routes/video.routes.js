import { Router } from 'express';
import {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
} from "../controllers/video.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middleware.js"
import { ownershipCheck } from "../middlewares/ownership.middlewares.js"
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
    .delete(ownershipCheck(Video, "videoId"), deleteVideo)
    .patch(ownershipCheck(Video, "videoId") , upload.single("thumbnail"), updateVideo);

router.route("/toggle/publish/:videoId").patch(ownershipCheck(Video, "videoId"), togglePublishStatus);

export default router