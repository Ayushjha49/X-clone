import { v2 as cloudinary } from "cloudinary";
import sanitizeHtml from "sanitize-html";

import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notifications.model.js";

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Strip all HTML tags from user-supplied text
const sanitizeText = (text) =>
    sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }).trim();

// Validate base64 image: type + size
const validateBase64Image = (base64String) => {
    const matches = base64String.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return { valid: false, error: "Invalid image format" };
    const mimeType = matches[1];
    const base64Data = matches[2];
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType))
        return { valid: false, error: "Only JPEG, PNG, GIF and WebP images are allowed" };
    const sizeInBytes = (base64Data.length * 3) / 4;
    if (sizeInBytes > MAX_IMAGE_SIZE_BYTES)
        return { valid: false, error: "Image must be under 5MB" };
    return { valid: true };
};

// Helper to populate a post query consistently
const populatePost = (query) => {
    return query
        .populate({ path: "user", select: "-password" })
        .populate({ path: "comments.user", select: "-password" })
        .populate({ path: "comments.replies.user", select: "-password" })
        .populate({
            path: "originalPost",
            populate: [
                { path: "user", select: "-password" },
                { path: "comments.user", select: "-password" },
                { path: "comments.replies.user", select: "-password" },
            ],
        });
};

export const createPost = async (req, res) => {
    try {
        let { text } = req.body;
        let { img } = req.body;
        const userId = req.user._id.toString();

        const user = await User.findById(userId);
        if (!user) return res.status(400).json({ message: "User not found" });

        if (!text && !img) return res.status(400).json({ error: "Post must have text or image" });

        // Sanitize text
        if (text) {
            text = sanitizeText(text);
            if (!text && !img) return res.status(400).json({ error: "Post must have text or image" });
        }

        if (img) {
            const validation = validateBase64Image(img);
            if (!validation.valid) return res.status(400).json({ error: validation.error });

            const uploadedResponse = await cloudinary.uploader.upload(img, {
                transformation: [{ width: 1200, crop: "limit", quality: "auto:good", fetch_format: "auto" }],
            });
            img = uploadedResponse.secure_url;
        }

        const newPost = new Post({ user: userId, text, img });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
        console.log("Error in createPost controller: ", error);
    }
};

export const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ error: "Post not found" });

        if (post.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ error: "You are not authorized to delete this post" });
        }

        if (post.img) {
            const imgId = post.img.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(imgId);
        }

        await Post.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.log("Error in deletePost controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const commentOnPost = async (req, res) => {
    try {
        let { text } = req.body;
        const postId = req.params.id;
        const userId = req.user._id;

        if (!text) return res.status(400).json({ error: "Text field is required" });
        text = sanitizeText(text);
        if (!text) return res.status(400).json({ error: "Comment cannot be empty" });

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ error: "Post not found" });

        post.comments.push({ user: userId, text, replies: [] });
        await post.save();

        if (post.user.toString() !== userId.toString()) {
            await new Notification({ from: userId, to: post.user, type: "comment" }).save();
        }

        const populatedPost = await populatePost(Post.findById(postId));
        res.status(200).json(populatedPost);
    } catch (error) {
        console.log("Error in commentOnPost controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const editComment = async (req, res) => {
    try {
        let { text } = req.body;
        const { postId, commentId } = req.params;
        const userId = req.user._id;

        if (!text) return res.status(400).json({ error: "Text is required" });
        text = sanitizeText(text);
        if (!text) return res.status(400).json({ error: "Comment cannot be empty" });

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ error: "Post not found" });

        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json({ error: "Comment not found" });
        if (comment.user.toString() !== userId.toString())
            return res.status(403).json({ error: "Not authorized to edit this comment" });

        comment.text = text;
        await post.save();

        const populatedPost = await populatePost(Post.findById(postId));
        res.status(200).json(populatedPost);
    } catch (error) {
        console.log("Error in editComment controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteComment = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const userId = req.user._id;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ error: "Post not found" });

        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json({ error: "Comment not found" });
        if (comment.user.toString() !== userId.toString())
            return res.status(403).json({ error: "Not authorized to delete this comment" });

        post.comments.pull({ _id: commentId });
        await post.save();

        const populatedPost = await populatePost(Post.findById(postId));
        res.status(200).json(populatedPost);
    } catch (error) {
        console.log("Error in deleteComment controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const replyToComment = async (req, res) => {
    try {
        let { text } = req.body;
        const { postId, commentId } = req.params;
        const userId = req.user._id;

        if (!text) return res.status(400).json({ error: "Text is required" });
        text = sanitizeText(text);
        if (!text) return res.status(400).json({ error: "Reply cannot be empty" });

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ error: "Post not found" });

        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json({ error: "Comment not found" });

        comment.replies.push({ user: userId, text, createdAt: new Date() });
        await post.save();

        const populatedPost = await populatePost(Post.findById(postId));
        res.status(200).json(populatedPost);
    } catch (error) {
        console.log("Error in replyToComment controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const likeUnlikePost = async (req, res) => {
    try {
        const { id: postId } = req.params;
        const userId = req.user._id;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ error: "Post not found" });

        const userLikedPost = post.likes.includes(userId);

        if (userLikedPost) {
            await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
            await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });
            const updatedLikes = post.likes.filter((id) => id.toString() !== userId.toString());
            res.status(200).json(updatedLikes);
        } else {
            post.likes.push(userId);
            await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
            await post.save();

            if (post.user.toString() !== userId.toString()) {
                await new Notification({ from: userId, to: post.user, type: "like" }).save();
            }

            res.status(200).json(post.likes);
        }
    } catch (error) {
        console.log("Error in likeUnlikePost controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getPostLikers = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate({ path: "likes", select: "username fullName profileImg" });
        if (!post) return res.status(404).json({ error: "Post not found" });
        res.status(200).json(post.likes);
    } catch (error) {
        console.log("Error in getPostLikers: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getPostRetweeters = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate({ path: "retweets", select: "username fullName profileImg" });
        if (!post) return res.status(404).json({ error: "Post not found" });
        res.status(200).json(post.retweets);
    } catch (error) {
        console.log("Error in getPostRetweeters: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getAllPosts = async (req, res) => {
    try {
        const limit = 10;
        const { cursor } = req.query;
        const filter = cursor ? { createdAt: { $lt: new Date(cursor) } } : {};
        const posts = await populatePost(Post.find(filter).sort({ createdAt: -1 }).limit(limit));
        const nextCursor = posts.length === limit ? posts[posts.length - 1].createdAt.toISOString() : null;
        res.status(200).json({ posts, nextCursor });
    } catch (error) {
        console.log("Error in getAllPosts controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getLikedPosts = async (req, res) => {
    const userId = req.params.id;
    try {
        const limit = 10;
        const { cursor } = req.query;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        const filter = { _id: { $in: user.likedPosts }, ...(cursor ? { createdAt: { $lt: new Date(cursor) } } : {}) };
        const posts = await populatePost(Post.find(filter).sort({ createdAt: -1 }).limit(limit));
        const nextCursor = posts.length === limit ? posts[posts.length - 1].createdAt.toISOString() : null;
        res.status(200).json({ posts, nextCursor });
    } catch (error) {
        console.log("Error in getLikedPosts controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getFollowingPosts = async (req, res) => {
    try {
        const limit = 10;
        const { cursor } = req.query;
        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        const filter = { user: { $in: user.following }, ...(cursor ? { createdAt: { $lt: new Date(cursor) } } : {}) };
        const posts = await populatePost(Post.find(filter).sort({ createdAt: -1 }).limit(limit));
        const nextCursor = posts.length === limit ? posts[posts.length - 1].createdAt.toISOString() : null;
        res.status(200).json({ posts, nextCursor });
    } catch (error) {
        console.log("Error in getFollowingPosts controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getUserPosts = async (req, res) => {
    try {
        const limit = 10;
        const { cursor } = req.query;
        const { username } = req.params;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: "User not found" });
        const filter = { user: user._id, ...(cursor ? { createdAt: { $lt: new Date(cursor) } } : {}) };
        const posts = await populatePost(Post.find(filter).sort({ createdAt: -1 }).limit(limit));
        const nextCursor = posts.length === limit ? posts[posts.length - 1].createdAt.toISOString() : null;
        res.status(200).json({ posts, nextCursor });
    } catch (error) {
        console.log("Error in getUserPosts controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const retweetPost = async (req, res) => {
    try {
        const { id: postId } = req.params;
        const userId = req.user._id;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ error: "Post not found" });

        const alreadyRetweeted = post.retweets.includes(userId);
        if (alreadyRetweeted) {
            await Post.updateOne({ _id: postId }, { $pull: { retweets: userId } });
            await Post.findOneAndDelete({ originalPost: postId, user: userId, isRetweet: true });
            return res.status(200).json({ message: "Retweet removed" });
        } else {
            await Post.updateOne({ _id: postId }, { $push: { retweets: userId } });
            await new Post({ user: userId, isRetweet: true, originalPost: postId }).save();
            if (post.user.toString() !== userId.toString()) {
                await new Notification({ from: userId, to: post.user, type: "retweet" }).save();
            }
            return res.status(200).json({ message: "Post retweeted" });
        }
    } catch (error) {
        console.log("Error in retweetPost controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const searchPosts = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ error: "Query is required" });

        // Use $regex for reliable partial/substring matching from the first character.
        // $text (full-text search) tokenises words and strips punctuation, so queries
        // like "I'm" or any partial word fail to match until a complete token is typed.
        const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const posts = await populatePost(
            Post.find({ text: { $regex: escapedQ, $options: "i" } })
                .sort({ createdAt: -1 })
                .limit(20)
        );
        res.status(200).json(posts);
    } catch (error) {
        console.log("Error in searchPosts controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getUserPostCount = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: "User not found" });
        const count = await Post.countDocuments({ user: user._id });
        res.status(200).json({ count });
    } catch (error) {
        console.log("Error in getUserPostCount controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getPostById = async (req, res) => {
    try {
        const post = await populatePost(Post.findById(req.params.id));
        if (!post) return res.status(404).json({ error: "Post not found" });
        res.status(200).json(post);
    } catch (error) {
        console.log("Error in getPostById controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
