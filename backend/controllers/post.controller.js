import { v2 as cloudinary } from "cloudinary";

import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notifications.model.js";

export const createPost = async (req, res) => {
    try {
        const { text } = req.body;
        let { img } = req.body;
        const userId = req.user._id.toString();

        const user = await User.findById(userId);
        if (!user) return res.status(400).json({ message: 'User not found' });

        if (!text && !img) return res.status(400).json({ error: "Post must have text or image" });

        if (img) {
            const uploadedResponse = await cloudinary.uploader.upload(img);
            img = uploadedResponse.secure_url;
        }

        const newPost = new Post({ user: userId, text, img });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
        console.log("Error in createPost controller: ", error);
    }
}

export const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ error: "Post not found" });

        if (post.user.toString() != req.user._id.toString()) {
            return res.status(401).json({ error: "You are not authorized to delete this post" });
        }

        if (post.img) {
            const imgId = post.img.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(imgId);
        }

        await Post.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.log("Error in deletePost controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const commentOnPost = async (req, res) => {
    try {
        const { text } = req.body;
        const postId = req.params.id;
        const userId = req.user._id;

        if (!text) return res.status(400).json({ error: "Text field is required" });

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ error: "Post not found" });

        const comment = { user: userId, text };
        post.comments.push(comment);
        await post.save();

        // Notify post owner (not if commenting on own post)
        if (post.user.toString() !== userId.toString()) {
            const notification = new Notification({
                from: userId,
                to: post.user,
                type: "comment",
            });
            await notification.save();
        }

        const populatedPost = await populatePost(Post.findById(postId));
        res.status(200).json(populatedPost);
    } catch (error) {
        console.log("Error in commentOnPost controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}

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

            // Notify post owner (not if liking own post)
            if (post.user.toString() !== userId.toString()) {
                const notification = new Notification({
                    from: userId,
                    to: post.user,
                    type: "like",
                });
                await notification.save();
            }

            res.status(200).json(post.likes);
        }
    } catch (error) {
        console.log("Error in likeUnlikePost controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Helper to populate a post query consistently
const populatePost = (query) => {
    return query
        .populate({ path: "user", select: "-password" })
        .populate({ path: "comments.user", select: "-password" })
        .populate({
            path: "originalPost",
            populate: [
                { path: "user", select: "-password" },
                { path: "comments.user", select: "-password" },
            ],
        });
};

export const getAllPosts = async (req, res) => {
    try {
        const limit = 10;
        const { cursor } = req.query; // cursor = createdAt of the oldest post on the previous page
        const filter = cursor ? { createdAt: { $lt: new Date(cursor) } } : {};

        const posts = await populatePost(Post.find(filter).sort({ createdAt: -1 }).limit(limit));
        const nextCursor = posts.length === limit ? posts[posts.length - 1].createdAt.toISOString() : null;
        res.status(200).json({ posts, nextCursor });
    } catch (error) {
        console.log("Error in getAllPosts controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}

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
}

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
}

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
}

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
            const retweetDoc = new Post({
                user: userId,
                isRetweet: true,
                originalPost: postId,
            });
            await retweetDoc.save();

            // Notify post owner (not if retweeting own post)
            if (post.user.toString() !== userId.toString()) {
                const notification = new Notification({
                    from: userId,
                    to: post.user,
                    type: "retweet",
                });
                await notification.save();
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

        const posts = await populatePost(
            Post.find({ text: { $regex: q, $options: "i" } })
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
