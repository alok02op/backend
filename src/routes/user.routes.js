import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js";
import multer from "multer";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { 
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken 
} from "../controllers/user.contollers.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name : "avatar",
            maxCount : 1
        },
        {
            name : "coverImage",
            maxCount : 1
        }
    ]),
    registerUser
)

router.route("/login").post(
    multer().none(),
    loginUser
)

// secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)


export default router