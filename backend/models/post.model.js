import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	text: {
		type: String,
	},
	img: {
		type: String,
	},
	likes: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
	],
	comments: [
		{
			text: {
				type: String,
				required: true,
			},
			user: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
				required: true,
			},
		},
	],
	retweets: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
	],
	// If this post is a retweet, originalPost points to the source
	originalPost: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Post",
		default: null,
	},
	isRetweet: {
		type: Boolean,
		default: false,
	},
}, { timestamps: true });

const Post = mongoose.model("Post", postSchema);

export default Post;
