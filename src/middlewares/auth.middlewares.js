import jwt from "jsonwebtoken";
import {User} from "../models/user.models.js"
import apiError from "../utils/apiError.js"
import { asyncHandler } from "../utils/asynchandler.js";


export const verifyJWT = asyncHandler(async (req, _, next) => {
    const token = req.cookies.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new apiError(401, "Access token is required");
    }

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken._id).select("-password");

        if (!user) {
            throw new apiError(404, "User not found");
        }

        req.user = user;
        next();
        
    } catch (error) {
        throw new apiError(403, "Invalid access token");
    }
});