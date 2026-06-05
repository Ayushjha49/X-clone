import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";

const uploadToCloudinary = async (url) => {
	try {
		const uploaded = await cloudinary.uploader.upload(url);
		return uploaded.secure_url;
	} catch (_) {
		return url; // fallback to original URL if upload fails
	}
};

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL: "/api/auth/google/callback",
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				// Check if user already exists with this Google ID
				let user = await User.findOne({ googleId: profile.id });

				if (user) {
					return done(null, user);
				}

				// Check if email already exists (user signed up normally before)
				user = await User.findOne({ email: profile.emails[0].value });

				if (user) {
					// Link Google ID to existing account
					user.googleId = profile.id;
					if (!user.profileImg && profile.photos[0]?.value) {
						user.profileImg = await uploadToCloudinary(profile.photos[0].value);
					}
					await user.save();
					return done(null, user);
				}

				// Create a new user
				const baseUsername = profile.displayName.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "") + Date.now().toString().slice(-6);

				const profileImgUrl = profile.photos[0]?.value
					? await uploadToCloudinary(profile.photos[0].value)
					: "";

				const newUser = new User({
					googleId: profile.id,
					fullName: profile.displayName,
					email: profile.emails[0].value,
					username: baseUsername,
					profileImg: profileImgUrl,
					password: null,
				});

				await newUser.save();
				return done(null, newUser);
			} catch (error) {
				return done(error, null);
			}
		}
	)
);

export default passport;
