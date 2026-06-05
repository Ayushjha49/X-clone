import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
	username: {
		type: String,
		required: true,
		unique: true,
	},
	fullName: {
		type: String,
		required: true,
	},
	password: {
		type: String,
		minLength: 6,
		default: null,
	},
	email: {
		type: String,
		required: true,
		unique: true,
	},
	googleId: {
		type: String,
		default: null,
	},
	followers: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: [],
		},
	],
	following: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: [],
		},
	],
	profileImg: {
		type: String,
		default: "",
	},
	coverImg: {
		type: String,
		default: "",
	},
	bio: {
		type: String,
		default: "",
	},
	link: {
		type: String,
		default: "",
	},
	likedPosts: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Post",
			default: [],
		},
	],
	bookmarks: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Post",
			default: [],
		},
	],
	lastSeen: {
		type: Date,
		default: Date.now,
	},
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;
