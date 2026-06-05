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
			replies: [
				{
					text: { type: String, required: true },
					user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
					createdAt: { type: Date, default: Date.now },
				},
			],
		},
	],
	retweets: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
	],
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

// Indexes for frequently queried fields
postSchema.index({ createdAt: -1 });
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ likes: 1 });
postSchema.index({ text: "text" }); // Full-text search index

const Post = mongoose.model("Post", postSchema);

export default Post;
