import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { bookmarkPost, getBookmarks } from "../controllers/bookmark.controller.js";

const router = express.Router();

router.get("/", protectRoute, getBookmarks);
router.post("/:id", protectRoute, bookmarkPost);

export default router;
