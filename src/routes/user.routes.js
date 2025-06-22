import { Router } from "express";
import { registerUser, loginUser, logoutUser } from "../controllers/user.contollers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import multer from "multer";

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


export default router