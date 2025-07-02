import { Router } from 'express';
import { checkOwnership } from "../middlewares/ownership.middlewares.js"
import { Tweet } from "../models/tweet.models.js"
import { 
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
} from "../controllers/tweet.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(createTweet);
router.route("/user/:userId").get(getUserTweets);

router
.route("/:tweetId")
.patch(checkOwnership(Tweet, "tweetId"), updateTweet)
.delete(checkOwnership(Tweet, "tweetId"), deleteTweet);

export default router