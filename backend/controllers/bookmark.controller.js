import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Notification from "../models/notifications.model.js";

export const bookmarkPost = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id: postId } = req.params;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ error: "Post not found" });

        const user = await User.findById(userId);
        const isBookmarked = user.bookmarks.includes(postId);

        if (isBookmarked) {
            await User.updateOne({ _id: userId }, { $pull: { bookmarks: postId } });
            return res.status(200).json({ message: "Bookmark removed" });
        } else {
            await User.updateOne({ _id: userId }, { $push: { bookmarks: postId } });

            // Notify post owner (not if bookmarking own post)
            if (post.user.toString() !== userId.toString()) {
                const notification = new Notification({
                    from: userId,
                    to: post.user,
                    type: "bookmark",
                });
                await notification.save();
            }

            return res.status(200).json({ message: "Post bookmarked" });
        }
    } catch (error) {
        console.log("Error in bookmarkPost controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getBookmarks = async (req, res) => {
    try {
        const limit = 10;
        const { cursor } = req.query;
        const userId = req.user._id;
        const user = await User.findById(userId);

        const filter = { _id: { $in: user.bookmarks }, ...(cursor ? { createdAt: { $lt: new Date(cursor) } } : {}) };
        const bookmarkedPosts = await Post.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate({ path: "user", select: "-password" })
            .populate({ path: "comments.user", select: "-password" });

        const nextCursor = bookmarkedPosts.length === limit ? bookmarkedPosts[bookmarkedPosts.length - 1].createdAt.toISOString() : null;
        res.status(200).json({ posts: bookmarkedPosts, nextCursor });
    } catch (error) {
        console.log("Error in getBookmarks controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
