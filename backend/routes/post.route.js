import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
	commentOnPost,
	createPost,
	deletePost,
	getAllPosts,
	getFollowingPosts,
	getLikedPosts,
	getUserPosts,
	getUserPostCount,
	likeUnlikePost,
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
router.get("/:id", protectRoute, getPostById);
router.post("/create", protectRoute, createPost);
router.post("/like/:id", protectRoute, likeUnlikePost);
router.post("/retweet/:id", protectRoute, retweetPost);
router.post("/comment/:id", protectRoute, commentOnPost);
router.delete("/:id", protectRoute, deletePost);

export default router;
