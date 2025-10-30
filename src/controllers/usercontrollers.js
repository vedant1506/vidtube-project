import { asyncHandler } from "../utils/asynchandler.js";
import apiError from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary,deleteFromCLoudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiresponse.js";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
 try {
       const user= await User.findById(userId)
       //to do for me  is check for user existance
        if (!user) {
           throw new Error("User not found");
        }
       const accessToken = user.
       generateAccessToken();   
       const refreshToken = user.generateRefreshToken();
   
       user.refreshToken = refreshToken
       await user.save({validateBeforeSave: false})
       return{accessToken,refreshToken}
 } catch (error) {
    throw new apiError(500, "Error generating tokens: " + error.message);
 }
    }

const registerUser = asyncHandler(async (req, res) => {
    // Destructure the required fields from the request body
    const { fullname, email, username, password } = req.body;

    // --- Validation Checks ---
    // Make sure all required fields are present and not just empty strings
    if ([fullname, email, username, password].some(field => !field || field.trim() === "")) {
        throw new apiError(400, "All fields are required");
    }

    // Check if the user already exists in the database
    // You need to await this operation and store the result in a variable
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new apiError(409, "User with email or username already exists");
    }

    // --- File Upload Checks ---
    // Get the local file paths for avatar and cover image
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverLocalPath = req.files?.coverImage?.[0]?.path;

    // The avatar file is mandatory for registration
    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar file is missing");
    }

    // Corrected function call to use 'uploadOnCloudinary'
     const avatar = await uploadOnCloudinary(avatarLocalPath);

    // Initialized coverImage to an empty string to handle the case where it's not provided
    // let coverImage = null; // Use null for clarity if no image is uploaded
    
    // if (coverImageLocalPath) {
    //     // Corrected the variable name for the function call
    //     // and assigned the result to the coverImage variable
    //     coverImage = await uploadOnCloudinary(coverImageLocalPath);
    // }

    let coverImage;
    try {
        console.log("Uploaded coverLoadPath",coverLocalPath)
        coverImage = await uploadOnCloudinary(coverLocalPath)
        
    } catch (error) {
        console.log("Error uploading coverimage",error)
        
         throw new apiError(500, "Avatar upload failed");
    }
 

    try {
        // --- Create User in Database ---
        const user = await User.create({
            fullname,
            avatar: avatar.url,
            // Used a ternary operator for a cleaner check
            coverImage: coverImage?.url || "",
            email,
            password, // The password should be hashed before saving
            username: username.toLowerCase()
        });
    
        // Fetch the created user from the database again to get a clean object
        // Corrected the select statement to use a comma separator
        const createdUser = await User.findById(user._id).select("-password -refreshToken");
    
        if (!createdUser) {
            throw new apiError(500, "Something went wrong while registering the user");
        }
    
        // Return a successful response
        return res
            .status(201)
            .json(new ApiResponse(200, createdUser, "User registered successfully"));
    } catch (error) {
        console.log("User creation failed")

        if(avatar) {
            await deleteFromCLoudinary(avatar.public_id)
        }
         if(coverImage) {
            await deleteFromCLoudinary(coverImage.public_id)
        }

          throw new apiError(500, "Something went wrong while registering the user and images were deleted");
    }
});

const loginUser = asyncHandler(async (req, res) => {
    //get data from body
    const {email,username,password} = req.body;

    //validation
    if (!email && !username || !password) {
        throw new apiError(400, "All fields are required");
    }

        const user = await User.findOne({
            $or: [{ username }, { email }]
        });

     if(!user) {
        throw new apiError(404, "User not found");
     }

    // Check if the password is correct
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new apiError(401, "Invalid email, username or password");
    }

    // Generate tokens
   const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id);

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

   const options = {
       httpOnly: true,
       secure: process.env.NODE_ENV === "production"
   }

    // Send response
    return res.
    status(200).
    cookie("accessToken", accessToken, options).
    cookie("refreshToken", refreshToken, options).
    json(new ApiResponse(
        200,
        {
            user: loggedInUser,
            message: "User logged in successfully"
        }
    ));
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $set: { refreshToken: null } },
        { new: true }
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
    .status(200)
    .cookie("accessToken", null, options)
    .cookie("refreshToken", null, options)
    .json(new ApiResponse(
        200,
        {
            message: "User logged out successfully"
        }
    ));
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new apiError(400, "Refresh token is required")
    }

    // Verify the refresh token
    const { userId } = await verifyToken(incomingRefreshToken, "REFRESH")

    if(!userId) {
        throw new apiError(403, "Invalid refresh token")
    }
    
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }
    
        // Generate new access and refresh tokens
        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(User._id)

    // Send response
    return res.
    status(200).
    cookie("accessToken", accessToken, options).
    cookie("refreshToken", refreshToken, options).
    json(new ApiResponse(
        200,
        {
            message: "Access token refreshed successfully"
        }
    ));
});

const changeCurrentPassword = asyncHandler(async (req,res) => {
    const {oldPassword,newPassword} = req.body
    const user = await User.findById(req.user?._id)

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

   if (!isPasswordValid) {
       throw new apiError(401, "Invalid old password")
   }

   user.password = newPassword
   await user.save()

   return res.status(200).json(new ApiResponse(
       200,
       {
           message: "Password changed successfully"
       }
   ))
})

const getCurrentUser = asyncHandler(async (req,res) => {
    return res.status(200).json(new ApiResponse(
        200,
        {
            user: req.user,
            message: "User retrieved successfully"
        }
    ))
})

const updateAccountDetails = asyncHandler(async (req,res) => {
    const {fullname,email} = req.body

    if(!fullname || !email) {
        throw new apiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, { 
        $set: { 
            fullname, 
            email 
        } 
    }, 
    { new: true }).select("-password -refreshToken");

    await user.save()

    return res.status(200).json(new ApiResponse(
        200,
        {
            message: "Account details updated successfully"
        }
    ))
})

const updateUserAvatar = asyncHandler(async (req,res) => {
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath) {
        throw new apiError(400, "Avatar file is missing")
    }

     const avatar = await uploadOnCloudinary(avatarLocalPath)

     if(!avatar.url) {
         throw new apiError(500, "Failed to upload avatar url")
     }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: { avatar: avatar.url }
        },
        { new: true }
    ).select("-password -refreshToken");

    await user.save()

    return res.status(200).json(new ApiResponse(
        200,
        {
            avatar: user.avatar,
            message: "Avatar updated successfully"
        }
    ))
})

const updateUserCoverImage = asyncHandler(async (req,res) => {
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath) {
        throw new apiError(400, "Cover image file is missing")
    }

     const coverImage = await uploadOnCloudinary(coverImageLocalPath)

     if(!coverImage.url) {
         throw new apiError(500, "Failed to upload cover image url")
     }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: { coverImage: coverImage.url }
        },
        { new: true }
    ).select("-password -refreshToken");

    await user.save()

    return res.status(200).json(new ApiResponse(
        200,
        {
            coverImage: user.coverImage,
            message: "Cover image updated successfully"
        }
    ))
})

const getuserChannelProfile = asyncHandler(async (req,res) => { 

    const {username} = req.params

    if(!username) {
        throw new apiError(400, "Username is required")
    }

    const channel = await User.aggregate([
        { 
            $match: { 
                username: username.toLowerCase() 
         } 
        },
        { $lookup: { 
            from: "subscriptions", 
            localField: "_id", 
            foreignField: "channel",
            as:"subscribers"  
         } },
         {
            $lookup: {
                from: "subscriptions",
                localField: "_id",  
                foreignField: "subscriber", 
                as: "subscribedTo"
            }
         },
         {
            $addFields:{
                subscribersCount: { $size: "$subscribers" },
                channelSUbscribedTo: {$size: "$subscribedTo"},
                isSubscribed: {$cond: {
                    if:{$in: [req.user?._id, "$subscribers.subscriber"]},
                    then: true,
                    else: false
                }}
            }
         }, 
         {
            //project only the necessary data
            $project: {
                fullname:1,
                username:1,
                avatar:1,
                subscribersCount:1,
                channelSUbscribedTo:1,
                isSubscribed:1,
                coverImage:1,
                email:1,
            }
         }
    ]
);

if(!channel || channel.length === 0) {
    throw new apiError(404, "Channel not found")
}

    return res.status(200).json(new ApiResponse(
        200,
            channel[0],
             "User channel profile retrieved successfully"
    ));
})

const getWatchHistory = asyncHandler(async (req,res) => { 
    const user = await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline: [
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline : [
                                {
                                    $project: {
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                },
                                {
                                    $addFields: {
                                        owner: { $arrayElemAt: ["$owner", 0] }
                                    }
                                }

                            ]
                        }
                    }
                ]
            }  
        }
    ])

    return res.status(200).json(new ApiResponse(
        200,
         
          user[0].watchHistory,
           "User watch history retrieved successfully"
        
    ));
})





export { 
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    updateUserCoverImage,
    updateUserAvatar,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    getuserChannelProfile,
    getWatchHistory
};
