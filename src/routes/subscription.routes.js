import { Router } from 'express';
import {
    toggleSubscription,
    getSubscribedChannels,
    getUserChannelSubscribers,
} from "../controllers/subscription.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

// Get channel's subscribers or subscribe/unsubscribe
router
    .route("/c/:channelId")
    .get(getUserChannelSubscribers)     // Only channel owner can access
    .post(toggleSubscription);          // Logged-in user toggles subscription

// Get logged-in user's subscribed channels
router.route("/u/:subscriberId").get(getSubscribedChannels);    // Only owner can access

export default router