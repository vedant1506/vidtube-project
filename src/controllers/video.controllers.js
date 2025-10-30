import { asyncHandler } from "../utils/asynchandler.js";
import apiError from "../utils/apiError.js";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary, deleteFromCLoudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiresponse.js";
import mongoose from "mongoose";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    const pipeline = [];

    // Match videos based on search query
    if (query) {
        pipeline.push({
            $match: {
                $or: [
                    { title: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } }
                ]
            }
        });
    }

    // Match videos by specific user
    if (userId) {
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        });
    }

    // Only show published videos
    pipeline.push({
        $match: {
            isPublished: true
        }
    });

    // Lookup owner details
    pipeline.push({
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [
                {
                    $project: {
                        fullname: 1,
                        username: 1,
                        avatar: 1
                    }
                }
            ]
        }
    });

    pipeline.push({
        $addFields: {
            owner: { $arrayElemAt: ["$owner", 0] }
        }
    });

    // Sort videos
    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "desc" ? -1 : 1
            }
        });
    } else {
        pipeline.push({
            $sort: {
                createdAt: -1
            }
        });
    }

    const videos = Video.aggregatePaginate(
        Video.aggregate(pipeline),
        {
            page: parseInt(page),
            limit: parseInt(limit)
        }
    );

    return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if ([title, description].some(field => !field || field.trim() === "")) {
        throw new apiError(400, "All fields are required");
    }

    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoLocalPath) {
        throw new apiError(400, "Video file is required");
    }

    if (!thumbnailLocalPath) {
        throw new apiError(400, "Thumbnail is required");
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile) {
        throw new apiError(400, "Video file upload failed");
    }

    if (!thumbnail) {
        throw new apiError(400, "Thumbnail upload failed");
    }

    const video = await Video.create({
        title,
        description,
        duration: videoFile.duration || 0,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        owner: req.user?._id,
        isPublished: false
    });

    const videoUploaded = await Video.findById(video._id);

    if (!videoUploaded) {
        throw new apiError(500, "Video upload failed please try again");
    }

    return res.status(200).json(new ApiResponse(200, video, "Video uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId?.trim()) {
        throw new apiError(400, "Video ID is missing");
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber"
                                        ]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $arrayElemAt: ["$owner", 0]
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                videoFile: 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ]);

    if (!video) {
        throw new apiError(404, "Video not found");
    }

    // Increment video views
    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1
        }
    });

    // Add this video to user watch history
    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: videoId
        }
    });

    return res.status(200).json(
        new ApiResponse(200, video[0], "Video details fetched successfully")
    );
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!videoId?.trim()) {
        throw new apiError(400, "Video ID is missing");
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID");
    }

    if (!(title && description)) {
        throw new apiError(400, "Title and description are required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new apiError(404, "Video not found");
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(400, "You can't edit this video as you are not the owner");
    }

    const thumbnailLocalPath = req.file?.path;
    let thumbnail;
    
    if (thumbnailLocalPath) {
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (!thumbnail) {
            throw new apiError(400, "Thumbnail upload failed");
        }
    }

    const updateData = {
        title,
        description,
    };

    if (thumbnail) {
        updateData.thumbnail = thumbnail.url;
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: updateData },
        { new: true }
    );

    if (!updatedVideo) {
        throw new apiError(500, "Failed to update video please try again");
    }

    return res.status(200).json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId?.trim()) {
        throw new apiError(400, "Video ID is missing");
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new apiError(404, "Video not found");
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(400, "You can't delete this video as you are not the owner");
    }

    const videoDeleted = await Video.findByIdAndDelete(video?._id);

    if (!videoDeleted) {
        throw new apiError(400, "Failed to delete the video please try again");
    }

    // Note: You'll need to store public_id separately if you want to delete from cloudinary
    // For now, we'll just delete the video record

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Video deleted successfully"
        )
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId?.trim()) {
        throw new apiError(400, "Video ID is missing");
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new apiError(404, "Video not found");
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(400, "You can't toogle publish status as you are not the owner");
    }

    const toggledVideoPublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished
            }
        },
        { new: true }
    );

    if (!toggledVideoPublish) {
        throw new apiError(500, "Failed to toogle video publish status");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            { isPublished: toggledVideoPublish.isPublished },
            `Video ${toggledVideoPublish.isPublished ? "published" : "unpublished"} successfully`
        )
    );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
};