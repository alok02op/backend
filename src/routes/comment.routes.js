import { Router } from 'express';
import {
    addComment,
    deleteComment,
    getVideoComments,
    updateComment,
} from "../controllers/comment.controllers.js"
import {verifyJWT} from "../middlewares/auth.middlewares.js"
import {checkOwnership} from "../middlewares/ownership.middlewares.js"
import {Comment} from "../models/comment.models.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
.route("/:videoId")
.get(getVideoComments)
.post(addComment);

router
.route("/c/:commentId")
.delete(checkOwnership(Comment, "commentId"), deleteComment)
.patch(checkOwnership(Comment, "commentId"), updateComment);

export default router