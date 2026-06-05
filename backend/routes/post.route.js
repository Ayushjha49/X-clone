import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import rateLimiter from "../middleware/rateLimiter.js";
import {
    commentOnPost,
    createPost,
    deletePost,
    editComment,
    deleteComment,
    replyToComment,
    getAllPosts,
    getFollowingPosts,
    getLikedPosts,
    getUserPosts,
    getUserPostCount,
    likeUnlikePost,
    getPostLikers,
    getPostRetweeters,
    retweetPost,
    searchPosts,
    getPostById,
} from "../controllers/post.controller.js";

const router = express.Router();

router.get("/all", protectRoute, getAllPosts);
router.get("/following", protectRoute, getFollowingPosts);
router.get("/likes/:id", protectRoute, getLikedPosts);
router.get("/user/:username/count", protectRoute, getUserPostCount);
router.get("/user/:username", protectRoute, getUserPosts);
router.get("/search", protectRoute, searchPosts);
router.get("/:id/likers", protectRoute, getPostLikers);
router.get("/:id/retweeters", protectRoute, getPostRetweeters);
router.get("/:id", protectRoute, getPostById);
router.post("/create", protectRoute, rateLimiter(20, 15 * 60 * 1000), createPost);
router.post("/like/:id", protectRoute, likeUnlikePost);
router.post("/retweet/:id", protectRoute, retweetPost);
router.post("/comment/:id", protectRoute, commentOnPost);
router.put("/comment/:postId/:commentId", protectRoute, editComment);
router.post("/comment/:postId/:commentId/reply", protectRoute, replyToComment);
router.delete("/comment/:postId/:commentId", protectRoute, deleteComment);
router.delete("/:id", protectRoute, deletePost);

export default router;
