import { FaRegComment } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { FaRegHeart, FaHeart } from "react-icons/fa";
import { FaRegBookmark, FaBookmark } from "react-icons/fa6";
import { FaTrash } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import LoadingSpinner from "./LoadingSpinner.jsx";
import useRelativeTime from "../../hooks/useRelativeTime.js";
import Avatar from "./Avatar.jsx";
import UserListModal from "./UserListModal.jsx";
import CommentRow from "./CommentRow.jsx";

const Post = ({ post }) => {
	const [comment, setComment] = useState("");
	const [lightboxImg, setLightboxImg] = useState(null);
	const [userListModal, setUserListModal] = useState(null);
	const { data: authUser } = useQuery({ queryKey: ["authUser"] });
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const displayPost = post.isRetweet && post.originalPost ? post.originalPost : post;
	const postOwner = displayPost.user;
	const isLiked = displayPost.likes.includes(authUser._id);
	const isRetweeted = displayPost.retweets?.includes(authUser._id);
	const isBookmarked = authUser.bookmarks?.includes(displayPost._id);
	const isMyPost = authUser._id === displayPost.user._id;
	const formattedDate = useRelativeTime(displayPost.createdAt);

	// Navigate to post detail when clicking anywhere on the card,
	// but not when the click is on an interactive element.
	const handleCardClick = (e) => {
		const tag = e.target.tagName.toLowerCase();
		const interactiveTags = ["button", "a", "textarea", "input", "svg", "path"];
		if (interactiveTags.includes(tag)) return;
		if (e.target.closest("button, a, textarea, input, dialog")) return;
		navigate(`/post/${displayPost._id}`);
	};

	// Update all feed caches when a comment/reply mutation succeeds
	const updateCachedPost = (updatedPost) => {
		queryClient.setQueriesData({ queryKey: ["posts"] }, (old) => {
			if (!old?.pages) return old;
			return {
				...old,
				pages: old.pages.map((pg) => ({
					...pg,
					posts: pg.posts.map((p) => {
						if (p._id === updatedPost._id) return updatedPost;
						if (p.isRetweet && p.originalPost?._id === updatedPost._id)
							return { ...p, originalPost: updatedPost };
						return p;
					}),
				})),
			};
		});
		queryClient.setQueryData(["post", updatedPost._id], updatedPost);
	};

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
			queryClient.setQueriesData({ queryKey: ["posts"] }, (oldData) => {
				if (!oldData?.pages) return oldData;
				return {
					...oldData,
					pages: oldData.pages.map((page) => ({
						...page,
						posts: page.posts.map((p) => {
							if (p._id === displayPost._id) return { ...p, likes: updatedLikes };
							if (p.isRetweet && p.originalPost?._id === displayPost._id)
								return { ...p, originalPost: { ...p.originalPost, likes: updatedLikes } };
							return p;
						}),
					})),
				};
			});
		},
		onError: (error) => toast.error(error.message),
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
			queryClient.setQueriesData({ queryKey: ["posts"] }, (oldData) => {
				if (!oldData?.pages) return oldData;
				return {
					...oldData,
					pages: oldData.pages.map((page) => ({
						...page,
						posts: page.posts.map((p) => {
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
						}),
					})),
				};
			});
		},
		onError: (error) => toast.error(error.message),
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
		onError: (error) => toast.error(error.message),
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
			const newComment = updatedPost.comments[updatedPost.comments.length - 1];
			const populatedComment = { ...newComment, user: authUser };
			const mergeComments = (existing) => [...existing.slice(0, -1), populatedComment];
			setComment("");
			document.getElementById("comments_modal" + displayPost._id)?.close();
			queryClient.setQueriesData({ queryKey: ["posts"] }, (oldData) => {
				if (!oldData?.pages) return oldData;
				return {
					...oldData,
					pages: oldData.pages.map((page) => ({
						...page,
						posts: page.posts.map((p) => {
							if (p._id === displayPost._id)
								return { ...p, comments: mergeComments(updatedPost.comments) };
							if (p.isRetweet && p.originalPost?._id === displayPost._id)
								return { ...p, originalPost: { ...p.originalPost, comments: mergeComments(updatedPost.comments) } };
							return p;
						}),
					})),
				};
			});
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<>
			{/* Image Lightbox */}
			{lightboxImg && (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90'
					onClick={() => setLightboxImg(null)}
				>
					<button className='absolute top-4 right-4 text-white hover:text-gray-300' onClick={() => setLightboxImg(null)}>
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

			{/* Who liked/retweeted modal */}
			{userListModal && (
				<UserListModal
					postId={displayPost._id}
					type={userListModal}
					onClose={() => setUserListModal(null)}
				/>
			)}

			<div className='flex flex-col border-b border-base-300 cursor-pointer hover:bg-base-content/[0.03] transition-colors duration-200' onClick={handleCardClick}>
				{post.isRetweet && (
					<div className='flex items-center gap-1 text-xs text-base-content/50 pt-2 pl-14'>
						<BiRepost className='w-4 h-4' />
						<span>{authUser._id === post.user._id ? "You" : post.user?.fullName} retweeted</span>
					</div>
				)}
				<div className='flex gap-2 items-start p-4'>
					<div className='avatar'>
						<Link
							to={`/profile/${postOwner.username}`}
							className='w-8 rounded-full overflow-hidden block'
							onClick={(e) => e.stopPropagation()}
						>
							<div className='w-8 rounded-full'>
								<Avatar src={postOwner.profileImg || "/avatar-placeholder.png"} />
							</div>
						</Link>
					</div>
					<div className='flex flex-col flex-1'>
						<div className='flex gap-2 items-center'>
							<Link
								to={`/profile/${postOwner.username}`}
								className='font-bold hover:underline'
								onClick={(e) => e.stopPropagation()}
							>
								{postOwner.fullName}
							</Link>
							<span className='text-base-content/50 flex gap-1 text-sm'>
								<Link
									to={`/profile/${postOwner.username}`}
									onClick={(e) => e.stopPropagation()}
								>
									@{postOwner.username}
								</Link>
								<span>·</span>
								<span
									title={new Date(displayPost.createdAt).toLocaleString("en-US", {
										month: "long", day: "numeric", year: "numeric",
										hour: "numeric", minute: "2-digit",
									})}
									className='cursor-default'
								>
									{formattedDate}
								</span>
							</span>
							{isMyPost && (
								<span className='flex justify-end flex-1'>
									{!isDeleting ? (
										<FaTrash
											className='cursor-pointer hover:text-red-500'
											onClick={(e) => { e.stopPropagation(); if (window.confirm("Delete this post? This cannot be undone.")) deletePost(); }}
										/>
									) : (
										<LoadingSpinner size='sm' />
									)}
								</span>
							)}
						</div>

						<div className='flex flex-col gap-3 overflow-hidden mt-1'>
							{displayPost.text && <span>{displayPost.text}</span>}
							{displayPost.img && (
								<img
									src={displayPost.img}
									className='h-80 object-contain rounded-lg border border-base-300 cursor-zoom-in'
									alt=''
									onClick={(e) => { e.stopPropagation(); setLightboxImg(displayPost.img); }}
								/>
							)}
						</div>

						<div className='flex justify-between mt-3'>
							<div className='flex gap-4 items-center w-2/3 justify-between'>
								{/* Comment button */}
								<div
									className='flex gap-1 items-center cursor-pointer group'
									onClick={(e) => {
										e.stopPropagation();
										document.getElementById("comments_modal" + displayPost._id).showModal();
									}}
								>
									<FaRegComment className='w-4 h-4 text-base-content/50 group-hover:text-sky-400' />
									<span className='text-sm text-base-content/50 group-hover:text-sky-400'>
										{displayPost.comments.length}
									</span>
								</div>

								{/* Comment modal */}
								<dialog id={`comments_modal${displayPost._id}`} className='modal border-none outline-none'>
									<div className='modal-box rounded border border-base-300 max-w-lg'>
										<h3 className='font-bold text-lg mb-4'>COMMENTS</h3>
										<div className='flex flex-col gap-4 max-h-72 overflow-auto pr-1'>
											{displayPost.comments.length === 0 && (
												<p className='text-sm text-base-content/50'>No comments yet 🤔 Be the first one 😉</p>
											)}
											{displayPost.comments.map((c) => (
												<CommentRow
													key={c._id}
													comment={c}
													postId={displayPost._id}
													authUser={authUser}
													onPostUpdated={updateCachedPost}
												/>
											))}
										</div>
										<form
											className='flex gap-2 items-center mt-4 border-t border-base-300 pt-2'
											onSubmit={(e) => { e.preventDefault(); if (!isCommenting) commentPost(); }}
										>
											<textarea
												className='textarea w-full p-1 rounded text-md resize-none border border-base-300 focus:outline-none bg-base-100'
												placeholder='Add a comment...'
												value={comment}
												onChange={(e) => setComment(e.target.value)}
											/>
											<button className='btn btn-primary rounded-full btn-sm text-white px-4' disabled={isCommenting || !comment.trim()}>
												{isCommenting ? <LoadingSpinner size='md' /> : "Post"}
											</button>
										</form>
									</div>
									<form method='dialog' className='modal-backdrop'>
										<button className='outline-none'>close</button>
									</form>
								</dialog>

								{/* Retweet */}
								<div
									className='flex gap-1 items-center group cursor-pointer'
									onClick={(e) => { e.stopPropagation(); if (!isRetweeting) retweetPost(); }}
								>
									{isRetweeting ? (
										<LoadingSpinner size='sm' />
									) : (
										<BiRepost className={`w-6 h-6 group-hover:text-green-500 ${isRetweeted ? "text-green-500" : "text-base-content/50"}`} />
									)}
									<span
										className={`text-sm group-hover:text-green-500 ${isRetweeted ? "text-green-500" : "text-base-content/50"} hover:underline`}
										onClick={(e) => { e.stopPropagation(); if (displayPost.retweets?.length > 0) setUserListModal("retweets"); }}
									>
										{displayPost.retweets?.length || 0}
									</span>
								</div>

								{/* Like */}
								<div
									className='flex gap-1 items-center group cursor-pointer'
									onClick={(e) => { e.stopPropagation(); if (!isLiking) likePost(); }}
								>
									{isLiking && <LoadingSpinner size='sm' />}
									{!isLiked && !isLiking && <FaRegHeart className='w-4 h-4 cursor-pointer text-base-content/50 group-hover:text-pink-500' />}
									{isLiked && !isLiking && <FaHeart className='w-4 h-4 cursor-pointer text-pink-500' />}
									<span
										className={`text-sm group-hover:text-pink-500 ${isLiked ? "text-pink-500" : "text-base-content/50"} hover:underline`}
										onClick={(e) => { e.stopPropagation(); if (displayPost.likes.length > 0) setUserListModal("likes"); }}
									>
										{displayPost.likes.length}
									</span>
								</div>
							</div>

							{/* Bookmark */}
							<div className='flex w-1/3 justify-end gap-2 items-center'>
								{isBookmarking ? (
									<LoadingSpinner size='sm' />
								) : isBookmarked ? (
									<FaBookmark
										className='w-4 h-4 text-primary cursor-pointer'
										onClick={(e) => { e.stopPropagation(); bookmarkPost(); }}
									/>
								) : (
									<FaRegBookmark
										className='w-4 h-4 text-base-content/50 cursor-pointer hover:text-primary'
										onClick={(e) => { e.stopPropagation(); bookmarkPost(); }}
									/>
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
