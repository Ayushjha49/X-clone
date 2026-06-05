import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import rateLimiter from "../middleware/rateLimiter.js";
import { followUnfollowUser, getSuggestedUsers, getUserProfile, updateUser, searchUsers, getFollowList } from "../controllers/user.controller.js";

const router = express.Router();

router.get("/profile/:username",protectRoute, getUserProfile);
router.get("/suggested",protectRoute, getSuggestedUsers);
router.post("/follow/:id", protectRoute, rateLimiter(30, 15 * 60 * 1000), followUnfollowUser);
router.post("/update",protectRoute, updateUser);
router.get("/search", protectRoute, searchUsers);
router.get("/:username/:type", protectRoute, getFollowList);


export default router;