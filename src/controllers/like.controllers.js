import mongoose from "mongoose";
import { Like } from "../models/like.models.js";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.models.js";
import apiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
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

    const likedAlready = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id,
    });

    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id);

        return res.status(200).json(new ApiResponse(200, { isLiked: false }, "Video unliked successfully"));
    }

    await Like.create({
        video: videoId,
        likedBy: req.user?._id,
    });

    return res.status(200).json(new ApiResponse(200, { isLiked: true }, "Video liked successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!commentId?.trim()) {
        throw new apiError(400, "Comment ID is missing");
    }

    if (!mongoose.isValidObjectId(commentId)) {
        throw new apiError(400, "Invalid comment ID");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new apiError(404, "Comment not found");
    }

    const likedAlready = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id,
    });

    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id);

        return res.status(200).json(new ApiResponse(200, { isLiked: false }, "Comment unliked successfully"));
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user?._id,
    });

    return res.status(200).json(new ApiResponse(200, { isLiked: true }, "Comment liked successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!tweetId?.trim()) {
        throw new apiError(400, "Tweet ID is missing");
    }

    if (!mongoose.isValidObjectId(tweetId)) {
        throw new apiError(400, "Invalid tweet ID");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new apiError(404, "Tweet not found");
    }

    const likedAlready = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id,
    });

    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id);

        return res.status(200).json(new ApiResponse(200, { isLiked: false }, "Tweet unliked successfully"));
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id,
    });

    return res.status(200).json(new ApiResponse(200, { isLiked: true }, "Tweet liked successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideosAggegate = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                        },
                    },
                    {
                        $unwind: "$ownerDetails",
                    },
                ],
            },
        },
        {
            $unwind: "$likedVideo",
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullname: 1,
                        "avatar.url": 1,
                    },
                },
            },
        },
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            likedVideosAggegate,
            "Liked videos fetched successfully"
        )
    );
});

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
};