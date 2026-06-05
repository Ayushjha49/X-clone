import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Posts from "../../components/common/Posts";
import ProfileHeaderSkeleton from "../../components/skeletons/ProfileHeaderSkeleton";
import EditProfileModal from "./EditProfileModal";
import ImageLightbox from "../../components/common/ImageLightbox.jsx";
import FollowListModal from "../../components/common/FollowListModal.jsx";

import { FaArrowLeft } from "react-icons/fa6";
import { IoCalendarOutline } from "react-icons/io5";
import { FaLink } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import { useQuery } from "@tanstack/react-query";
import { formatMemberSinceDate } from "../../utils/date";

import useFollow from "../../hooks/useFollow";
import useUpdateUserProfile from "../../hooks/updateUserProfile";
import Avatar from "../../components/common/Avatar.jsx";

const PostCount = ({ username }) => {
	const { data } = useQuery({
		queryKey: ["postCount", username],
		queryFn: async () => {
			const res = await fetch(`/api/posts/user/${username}/count`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
	});
	return <span className='text-sm text-base-content/50'>{data?.count ?? 0} posts</span>;
};

const ProfilePage = () => {
	const [coverImg, setCoverImg] = useState(null);
	const [profileImg, setProfileImg] = useState(null);
	const [feedType, setFeedType] = useState("posts");
	const [lightbox, setLightbox] = useState(null); // "profile" | "cover" | null
	const [followModal, setFollowModal] = useState(null); // "followers" | "following" | null

	const coverImgRef = useRef(null);
	const profileImgRef = useRef(null);

	const { username } = useParams();

	const { follow, isFollowPending } = useFollow();
	const { data: authUser } = useQuery({ queryKey: ["authUser"] });

	const {
		data: user,
		isLoading,
		refetch,
		isRefetching,
	} = useQuery({
		queryKey: ["userProfile", username], // ← includes username so different profiles don't share cache
		queryFn: async () => {
			try {
				const res = await fetch(`/api/users/profile/${username}`);
				const data = await res.json();
				if (!res.ok) throw new Error(data.error || "Something went wrong");
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
	});

	const { isUpdatingProfile, updateProfile } = useUpdateUserProfile();

	const isMyProfile = authUser._id === user?._id;
	const memberSinceDate = formatMemberSinceDate(user?.createdAt);
	const amIFollowing = authUser?.following.includes(user?._id);

	const handleImgChange = (e, state) => {
		const file = e.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = () => {
				state === "coverImg" && setCoverImg(reader.result);
				state === "profileImg" && setProfileImg(reader.result);
			};
			reader.readAsDataURL(file);
		}
	};

	useEffect(() => {
		refetch();
	}, [username, refetch]);

	return (
		<>
			{/* Image lightbox */}
			{lightbox === "profile" && (
				<ImageLightbox
					src={user?.profileImg || "/avatar-placeholder.png"}
					onClose={() => setLightbox(null)}
				/>
			)}
			{lightbox === "cover" && (
				<ImageLightbox
					src={user?.coverImg || "/cover.png"}
					onClose={() => setLightbox(null)}
				/>
			)}

			{/* Followers/Following modal */}
			{followModal && (
				<FollowListModal
					username={username}
					type={followModal}
					onClose={() => setFollowModal(null)}
				/>
			)}

			<div className='flex-[4_4_0] border-r border-base-300 min-h-screen'>
				{(isLoading || isRefetching) && <ProfileHeaderSkeleton />}
				{!isLoading && !isRefetching && !user && (
					<p className='text-center text-lg mt-4'>User not found</p>
				)}
				<div className='flex flex-col'>
					{!isLoading && !isRefetching && user && (
						<>
							<div className='flex gap-10 px-4 py-2 items-center'>
								<Link to='/' className='p-2 rounded-full hover:bg-white/15 transition-colors duration-200'>
									<FaArrowLeft className='w-4 h-4' />
								</Link>
								<div className='flex flex-col'>
									<p className='font-bold text-lg'>{user?.fullName}</p>
									<PostCount username={username} />
								</div>
							</div>

							{/* COVER IMG */}
							<div className='relative group/cover'>
								<img
									src={coverImg || user?.coverImg || "/cover.png"}
									className='h-52 w-full object-cover cursor-pointer'
									alt='cover image'
									onError={(e) => { e.target.onerror = null; e.target.src = "/cover.png"; }}
									onClick={() => !coverImg && setLightbox("cover")}
								/>
								{isMyProfile && (
									<div
										className='absolute top-2 right-2 rounded-full p-2 bg-neutral bg-opacity-75 cursor-pointer opacity-0 group-hover/cover:opacity-100 transition duration-200'
										onClick={() => coverImgRef.current.click()}
									>
										<MdEdit className='w-5 h-5 text-neutral-content' />
									</div>
								)}
								<input type='file' hidden accept='image/*' ref={coverImgRef} onChange={(e) => handleImgChange(e, "coverImg")} />
								<input type='file' hidden accept='image/*' ref={profileImgRef} onChange={(e) => handleImgChange(e, "profileImg")} />

								{/* USER AVATAR */}
								<div className='avatar absolute -bottom-16 left-4'>
									<div className='w-32 rounded-full relative group/avatar'>
										<Avatar
											src={profileImg || user?.profileImg || "/avatar-placeholder.png"}
											className='cursor-pointer'
											onClick={() => !profileImg && setLightbox("profile")}
										/>
										{isMyProfile && (
											<div className='absolute top-5 right-3 p-1 bg-primary rounded-full group-hover/avatar:opacity-100 opacity-0 cursor-pointer'>
												<MdEdit
													className='w-4 h-4 text-white'
													onClick={() => profileImgRef.current.click()}
												/>
											</div>
										)}
									</div>
								</div>
							</div>

							<div className='flex justify-end px-4 mt-5'>
								{isMyProfile && <EditProfileModal authUser={authUser} />}
								{!isMyProfile && (
									<button
										className='btn btn-outline rounded-full btn-sm'
										onClick={() => follow(user?._id)}
									>
										{isFollowPending(user?._id) && "Loading..."}
										{!isFollowPending(user?._id) && amIFollowing && "Unfollow"}
										{!isFollowPending(user?._id) && !amIFollowing && "Follow"}
									</button>
								)}
								{(coverImg || profileImg) && (
									<button
										className='btn btn-primary rounded-full btn-sm text-white px-4 ml-2'
										onClick={async () => {
											await updateProfile({ coverImg, profileImg });
											setProfileImg(null);
											setCoverImg(null);
										}}
									>
										{isUpdatingProfile ? "Updating..." : "Update"}
									</button>
								)}
							</div>

							<div className='flex flex-col gap-4 mt-14 px-4'>
								<div className='flex flex-col'>
									<span className='font-bold text-lg'>{user?.fullName}</span>
									<span className='text-sm text-base-content/50'>@{user?.username}</span>
									<span className='text-sm my-1'>{user?.bio}</span>
								</div>
								<div className='flex gap-2 flex-wrap'>
									{user?.link && (
										<div className='flex gap-1 items-center'>
											<FaLink className='w-3 h-3 text-base-content/50' />
											<a
												href={user?.link}
												target='_blank'
												rel='noreferrer'
												className='text-sm text-blue-500 hover:underline'
											>
												{user?.link}
											</a>
										</div>
									)}
									<div className='flex gap-2 items-center'>
										<IoCalendarOutline className='w-4 h-4 text-base-content/50' />
										<span className='text-sm text-base-content/50'>{memberSinceDate}</span>
									</div>
								</div>
								<div className='flex gap-4'>
									<button
										className='flex gap-1 items-center hover:underline'
										onClick={() => setFollowModal("following")}
									>
										<span className='font-bold text-xs'>{user?.following.length}</span>
										<span className='text-base-content/50 text-xs'>Following</span>
									</button>
									<button
										className='flex gap-1 items-center hover:underline'
										onClick={() => setFollowModal("followers")}
									>
										<span className='font-bold text-xs'>{user?.followers.length}</span>
										<span className='text-base-content/50 text-xs'>Followers</span>
									</button>
								</div>
							</div>

							<div className='flex w-full border-b border-base-300 mt-4'>
								<div
									className={`flex justify-center flex-1 p-3 hover:bg-base-200 transition duration-300 relative cursor-pointer ${feedType === "posts" ? "font-bold" : "text-base-content/50"}`}
									onClick={() => setFeedType("posts")}
								>
									Posts
									{feedType === "posts" && (
										<div className='absolute bottom-0 w-10 h-1 rounded-full bg-primary' />
									)}
								</div>
								<div
									className={`flex justify-center flex-1 p-3 hover:bg-base-200 transition duration-300 relative cursor-pointer ${feedType === "likes" ? "font-bold" : "text-base-content/50"}`}
									onClick={() => setFeedType("likes")}
								>
									Likes
									{feedType === "likes" && (
										<div className='absolute bottom-0 w-10 h-1 rounded-full bg-primary' />
									)}
								</div>
							</div>
						</>
					)}
					<Posts feedType={feedType} username={username} userId={user?._id} />
				</div>
			</div>
		</>
	);
};
export default ProfilePage;
