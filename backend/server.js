import "./env.js"; // must be first — loads dotenv before any other imports use process.env
import path from "path";
import express from "express";
import cookieParser from "cookie-parser";
import { v2 as cloudinary } from "cloudinary";
import passport from "./middleware/passport.js";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import postRoutes from "./routes/post.route.js";
import notificationRoutes from "./routes/notification.route.js";
import bookmarkRoutes from "./routes/bookmark.route.js";
import rateLimiter from "./middleware/rateLimiter.js";

import connectMongoDB from "./db/connectMongoDB.js";

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = process.env.PORT || 8000;
const __dirname = path.resolve();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Rate limit only login and signup
app.use("/api/auth/login", rateLimiter(10, 15 * 60 * 1000));
app.use("/api/auth/signup", rateLimiter(10, 15 * 60 * 1000));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/bookmarks", bookmarkRoutes);

if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "/frontend/dist")));

	app.get("*splat", (req, res) => {
		res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
	});
}

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
	connectMongoDB();
});
