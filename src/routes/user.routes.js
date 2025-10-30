import { Router } from "express";

import {
    getuserChannelProfile, 
    getWatchHistory, 
    loginUser, 
    refreshAccessToken, 
    registerUser,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserCoverImage,
    updateUserAvatar
} from "../controllers/usercontrollers.js";

import{upload} from "../middlewares/multer.middleware.js"

import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { get } from "mongoose";

const router = Router()


//UNSECURED ROUTES   
router.route("/register").post(upload.fields([
{
    name: "avatar",
    maxCount: 1
},{
    name: "coverimage",
    maxCount: 1
}
]),
registerUser)

router.route("/login").post(loginUser)
router.route("/refresh-token").post(refreshAccessToken)

//secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/change-password").put(verifyJWT, changeCurrentPassword)

router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/c/:username").get(verifyJWT, getuserChannelProfile)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(verifyJWT, upload.single("coverimage"), updateUserCoverImage)
router.route("/history").get(verifyJWT, getWatchHistory )
export default router