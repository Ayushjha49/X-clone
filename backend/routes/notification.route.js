import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { deleteNotification, deleteNotifications, getNotifications, getUnreadCount } from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protectRoute, getNotifications);
router.get("/unread", protectRoute, getUnreadCount);
router.delete("/", protectRoute, deleteNotifications);
router.delete("/:id", protectRoute, deleteNotification);

export default router;
