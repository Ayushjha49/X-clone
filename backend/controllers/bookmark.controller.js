import User from "../models/user.model.js";
import Post from "../models/post.model.js";

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
			return res.status(200).json({ message: "Post bookmarked" });
		}
	} catch (error) {
		console.log("Error in bookmarkPost controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getBookmarks = async (req, res) => {
	try {
		const userId = req.user._id;
		const user = await User.findById(userId);

		const bookmarkedPosts = await Post.find({ _id: { $in: user.bookmarks } })
			.sort({ createdAt: -1 })
			.populate({ path: "user", select: "-password" })
			.populate({ path: "comments.user", select: "-password" });

		res.status(200).json(bookmarkedPosts);
	} catch (error) {
		console.log("Error in getBookmarks controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};
