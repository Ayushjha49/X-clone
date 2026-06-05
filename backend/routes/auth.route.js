import express from "express";
import passport from "../middleware/passport.js";
import { getMe, login, logout, signup, googleCallback } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();

router.get("/me", protectRoute, getMe);
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

// Google OAuth routes
router.get(
	"/google",
	passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
	"/google/callback",
	passport.authenticate("google", { failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`, session: false }),
	googleCallback
);

export default router;
