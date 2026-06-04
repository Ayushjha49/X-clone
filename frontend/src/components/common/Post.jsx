import { FaRegComment } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { FaRegHeart, FaHeart } from "react-icons/fa";
import { FaRegBookmark, FaBookmark } from "react-icons/fa6";
import { FaTrash } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import LoadingSpinner from "./LoadingSpinner.jsx";
import useRelativeTime from "../../hooks/useRelativeTime.js";

const Post = ({ post }) => {
	const [comment, setComment] = useState("");
	const [lightboxImg, setLightboxImg] = useState(null);
	const { data: authUser } = useQuery({ queryKey: ["authUser"] });
	const queryClient = useQueryClient();

	// If this is a retweet, display content from the original post
	const displayPost = post.isRetweet && post.originalPost ? post.originalPost : post;

	const postOwner = displayPost.user;
	const isLiked = displayPost.likes.includes(authUser._id);
	const isRetweeted = displayPost.retweets?.includes(authUser._id);
	const isBookmarked = authUser.bookmarks?.includes(displayPost._id);
	const isMyPost = authUser._id === displayPost.user._id;

	const formattedDate = useRelativeTime(displayPost.createdAt);

	const { mutate: deletePost, isPending: isDeleting } = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/posts/${post._id}`, { method: "DELETE" });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		onSuccess: () => {
			toast.success("Post deleted successfully");
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
	});

	const { mutate: likePost, isPending: isLiking } = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/posts/like/${displayPost._id}`, { method: "POST" });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		onSuccess: (updatedLikes) => {
			queryClient.setQueryData(["posts"], (oldData) => {
				if (!oldData) return oldData;
				return oldData.map((p) => {
					if (p._id === displayPost._id) return { ...p, likes: updatedLikes };
					if (p.isRetweet && p.originalPost?._id === displayPost._id) {
						return { ...p, originalPost: { ...p.originalPost, likes: updatedLikes } };
					}
					return p;
				});
			});
		},
		onError: (error) => { toast.error(error.message); },
	});

	const { mutate: retweetPost, isPending: isRetweeting } = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/posts/retweet/${displayPost._id}`, { method: "POST" });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		onSuccess: (data) => {
			toast.success(data.message);
			const wasRetweeted = isRetweeted;
			queryClient.setQueryData(["posts"], (oldData) => {
				if (!oldData) return oldData;
				return oldData.map((p) => {
					if (p._id === displayPost._id) {
						const updatedRetweets = wasRetweeted
							? p.retweets.filter((id) => id !== authUser._id)
							: [...p.retweets, authUser._id];
						return { ...p, retweets: updatedRetweets };
					}
					if (p.isRetweet && p.originalPost?._id === displayPost._id) {
						const updatedRetweets = wasRetweeted
							? p.originalPost.retweets.filter((id) => id !== authUser._id)
							: [...p.originalPost.retweets, authUser._id];
						return { ...p, originalPost: { ...p.originalPost, retweets: updatedRetweets } };
					}
					return p;
				});
			});
		},
		onError: (error) => { toast.error(error.message); },
	});

	const { mutate: bookmarkPost, isPending: isBookmarking } = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/bookmarks/${displayPost._id}`, { method: "POST" });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: ["authUser"] });
			queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
		},
		onError: (error) => { toast.error(error.message); },
	});

	const { mutate: commentPost, isPending: isCommenting } = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/posts/comment/${displayPost._id}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: comment }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		onSuccess: (updatedPost) => {
			toast.success("Comment posted successfully");
			setComment("");
			document.getElementById("comments_modal" + displayPost._id)?.close();
			queryClient.setQueryData(["posts"], (oldData) => {
				if (!oldData) return oldData;
				return oldData.map((p) => {
					if (p._id === displayPost._id) return { ...p, comments: updatedPost.comments };
					if (p.isRetweet && p.originalPost?._id === displayPost._id) {
						return { ...p, originalPost: { ...p.originalPost, comments: updatedPost.comments } };
					}
					return p;
				});
			});
		},
		onError: (error) => { toast.error(error.message); },
	});

	const handleDeletePost = () => deletePost();
	const handlePostComment = (e) => { e.preventDefault(); if (!isCommenting) commentPost(); };
	const handleLikePost = () => { if (!isLiking) likePost(); };
	const handleRetweetPost = () => { if (!isRetweeting) retweetPost(); };
	const handleBookmarkPost = () => { if (!isBookmarking) bookmarkPost(); };

	return (
		<>
			{/* Image Lightbox */}
			{lightboxImg && (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90'
					onClick={() => setLightboxImg(null)}
				>
					<button
						className='absolute top-4 right-4 text-white hover:text-gray-300'
						onClick={() => setLightboxImg(null)}
					>
						<IoClose className='w-8 h-8' />
					</button>
					<img
						src={lightboxImg}
						className='max-h-screen max-w-screen-lg object-contain p-4'
						onClick={(e) => e.stopPropagation()}
						alt='fullscreen'
					/>
				</div>
			)}

			<div className='flex flex-col border-b border-base-300'>
				{/* Retweet label */}
				{post.isRetweet && (
					<div className='flex items-center gap-1 text-xs text-base-content/50 pt-2 pl-14'>
						<BiRepost className='w-4 h-4' />
						<span>{authUser._id === post.user._id ? "You" : post.user?.fullName} retweeted</span>
					</div>
				)}
				<div className='flex gap-2 items-start p-4'>
					<div className='avatar'>
						<Link to={`/profile/${postOwner.username}`} className='w-8 rounded-full overflow-hidden'>
							<img src={postOwner.profileImg || "/avatar-placeholder.png"} />
						</Link>
					</div>
					<div className='flex flex-col flex-1'>
						<div className='flex gap-2 items-center'>
							<Link to={`/profile/${postOwner.username}`} className='font-bold'>
								{postOwner.fullName}
							</Link>
							<span className='text-base-content/50 flex gap-1 text-sm'>
								<Link to={`/profile/${postOwner.username}`}>@{postOwner.username}</Link>
								<span>·</span>
								<span>{formattedDate}</span>
							</span>
							{isMyPost && (
								<span className='flex justify-end flex-1'>
									{!isDeleting && (
										<FaTrash className='cursor-pointer hover:text-red-500' onClick={handleDeletePost} />
									)}
									{isDeleting && <LoadingSpinner size='sm' />}
								</span>
							)}
						</div>
						<div className='flex flex-col gap-3 overflow-hidden'>
							{/* Post text links to detail page */}
							<Link to={`/post/${displayPost._id}`}>
								<span className='hover:underline cursor-pointer'>{displayPost.text}</span>
							</Link>
							{displayPost.img && (
								<img
									src={displayPost.img}
									className='h-80 object-contain rounded-lg border border-base-300 cursor-zoom-in'
									alt=''
									onClick={() => setLightboxImg(displayPost.img)}
								/>
							)}
						</div>
						<div className='flex justify-between mt-3'>
							<div className='flex gap-4 items-center w-2/3 justify-between'>
								{/* Comment */}
								<div
									className='flex gap-1 items-center cursor-pointer group'
									onClick={() => document.getElementById("comments_modal" + displayPost._id).showModal()}
								>
									<FaRegComment className='w-4 h-4 text-base-content/50 group-hover:text-sky-400' />
									<span className='text-sm text-base-content/50 group-hover:text-sky-400'>
										{displayPost.comments.length}
									</span>
								</div>

								<dialog id={`comments_modal${displayPost._id}`} className='modal border-none outline-none'>
									<div className='modal-box rounded border border-base-300'>
										<h3 className='font-bold text-lg mb-4'>COMMENTS</h3>
										<div className='flex flex-col gap-3 max-h-60 overflow-auto'>
											{displayPost.comments.length === 0 && (
												<p className='text-sm text-base-content/50'>
													No comments yet 🤔 Be the first one 😉
												</p>
											)}
											{displayPost.comments.map((comment) => (
												<div key={comment._id} className='flex gap-2 items-start'>
													<div className='avatar'>
														<div className='w-8 rounded-full'>
															<img src={comment.user.profileImg || "/avatar-placeholder.png"} />
														</div>
													</div>
													<div className='flex flex-col'>
														<div className='flex items-center gap-1'>
															<span className='font-bold'>{comment.user.fullName}</span>
															<span className='text-base-content/50 text-sm'>@{comment.user.username}</span>
														</div>
														<div className='text-sm'>{comment.text}</div>
													</div>
												</div>
											))}
										</div>
										<form
											className='flex gap-2 items-center mt-4 border-t border-base-300 pt-2'
											onSubmit={handlePostComment}
										>
											<textarea
												className='textarea w-full p-1 rounded text-md resize-none border border-base-300 focus:outline-none bg-base-100'
												placeholder='Add a comment...'
												value={comment}
												onChange={(e) => setComment(e.target.value)}
											/>
											<button className='btn btn-primary rounded-full btn-sm text-white px-4'>
												{isCommenting ? <LoadingSpinner size='md' /> : "Post"}
											</button>
										</form>
									</div>
									<form method='dialog' className='modal-backdrop'>
										<button className='outline-none'>close</button>
									</form>
								</dialog>

								{/* Retweet */}
								<div className='flex gap-1 items-center group cursor-pointer' onClick={handleRetweetPost}>
									{isRetweeting ? (
										<LoadingSpinner size='sm' />
									) : (
										<BiRepost
											className={`w-6 h-6 group-hover:text-green-500 ${isRetweeted ? "text-green-500" : "text-base-content/50"}`}
										/>
									)}
									<span className={`text-sm group-hover:text-green-500 ${isRetweeted ? "text-green-500" : "text-base-content/50"}`}>
										{displayPost.retweets?.length || 0}
									</span>
								</div>

								{/* Like */}
								<div className='flex gap-1 items-center group cursor-pointer' onClick={handleLikePost}>
									{isLiking && <LoadingSpinner size='sm' />}
									{!isLiked && !isLiking && (
										<FaRegHeart className='w-4 h-4 cursor-pointer text-base-content/50 group-hover:text-pink-500' />
									)}
									{isLiked && !isLiking && <FaHeart className='w-4 h-4 cursor-pointer text-pink-500' />}
									<span className={`text-sm group-hover:text-pink-500 ${isLiked ? "text-pink-500" : "text-base-content/50"}`}>
										{displayPost.likes.length}
									</span>
								</div>
							</div>

							{/* Bookmark */}
							<div className='flex w-1/3 justify-end gap-2 items-center'>
								{isBookmarking ? (
									<LoadingSpinner size='sm' />
								) : isBookmarked ? (
									<FaBookmark className='w-4 h-4 text-primary cursor-pointer' onClick={handleBookmarkPost} />
								) : (
									<FaRegBookmark className='w-4 h-4 text-base-content/50 cursor-pointer hover:text-primary' onClick={handleBookmarkPost} />
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
export default Post;
