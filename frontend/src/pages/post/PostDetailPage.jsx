import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FaArrowLeft, FaRegHeart, FaHeart, FaRegBookmark, FaBookmark, FaTrash } from "react-icons/fa";
import { FaRegComment } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { toast } from "react-hot-toast";

import LoadingSpinner from "../../components/common/LoadingSpinner.jsx";
import useRelativeTime from "../../hooks/useRelativeTime.js";
import Avatar from "../../components/common/Avatar.jsx";
import CommentRow from "../../components/common/CommentRow.jsx";
import UserListModal from "../../components/common/UserListModal.jsx";

const PostDetailPage = () => {
	const { id } = useParams();
	const [comment, setComment] = useState("");
	const [userListModal, setUserListModal] = useState(null);
	const { data: authUser } = useQuery({ queryKey: ["authUser"] });
	const queryClient = useQueryClient();

	const { data: post, isLoading } = useQuery({
		queryKey: ["post", id],
		queryFn: async () => {
			const res = await fetch(`/api/posts/${id}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
	});

	const displayPost = post?.isRetweet && post?.originalPost ? post.originalPost : post;
	const isLiked = displayPost?.likes?.includes(authUser._id);
	const isRetweeted = displayPost?.retweets?.includes(authUser._id);
	const isBookmarked = authUser.bookmarks?.includes(displayPost?._id);
	const isMyPost = authUser._id === displayPost?.user?._id;
	const formattedDate = useRelativeTime(displayPost?.createdAt);

	// Update the single-post cache when a comment/reply mutation succeeds
	const updateCachedPost = (updatedPost) => {
		queryClient.setQueryData(["post", id], (old) => {
			if (!old) return old;
			if (old.isRetweet) return { ...old, originalPost: updatedPost };
			return updatedPost;
		});
		// Also sync feed caches
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
	};

	const { mutate: likePost, isPending: isLiking } = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/posts/like/${displayPost._id}`, { method: "POST" });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		onSuccess: (updatedLikes) => {
			queryClient.setQueryData(["post", id], (old) => {
				if (!old) return old;
				if (old.isRetweet) return { ...old, originalPost: { ...old.originalPost, likes: updatedLikes } };
				return { ...old, likes: updatedLikes };
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
			queryClient.invalidateQueries({ queryKey: ["post", id] });
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
			window.history.back();
		},
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
			const withPopulated = [...updatedPost.comments.slice(0, -1), populatedComment];
			setComment("");
			queryClient.setQueryData(["post", id], (old) => {
				if (!old) return old;
				if (old.isRetweet) return { ...old, originalPost: { ...old.originalPost, comments: withPopulated } };
				return { ...old, comments: withPopulated };
			});
		},
		onError: (error) => toast.error(error.message),
	});

	if (isLoading) {
		return (
			<div className='flex-[4_4_0] border-r border-base-300 min-h-screen flex justify-center items-center'>
				<LoadingSpinner size='lg' />
			</div>
		);
	}

	if (!post) {
		return (
			<div className='flex-[4_4_0] border-r border-base-300 min-h-screen flex justify-center items-center'>
				<p className='text-base-content/50'>Post not found</p>
			</div>
		);
	}

	return (
		<div className='flex-[4_4_0] border-r border-base-300 min-h-screen'>

			{/* Who liked/retweeted modal */}
			{userListModal && (
				<UserListModal
					postId={displayPost._id}
					type={userListModal}
					onClose={() => setUserListModal(null)}
				/>
			)}

			{/* Header */}
			<div className='flex items-center gap-4 p-4 border-b border-base-300'>
				<button onClick={() => window.history.back()}>
					<FaArrowLeft className='w-4 h-4' />
				</button>
				<p className='font-bold text-lg'>Post</p>
			</div>

			{/* Retweet label */}
			{post.isRetweet && (
				<div className='flex items-center gap-1 text-xs text-base-content/50 pt-3 pl-14'>
					<BiRepost className='w-4 h-4' />
					<span>{authUser._id === post.user._id ? "You" : post.user?.fullName} retweeted</span>
				</div>
			)}

			{/* Post body */}
			<div className='p-4 border-b border-base-300'>
				<div className='flex gap-3 items-start'>
					<Link to={`/profile/${displayPost.user.username}`}>
						<div className='avatar'>
							<div className='w-10 rounded-full'>
								<Avatar src={displayPost.user.profileImg || "/avatar-placeholder.png"} />
							</div>
						</div>
					</Link>
					<div className='flex flex-col flex-1'>
						<div className='flex items-center justify-between'>
							<div>
								<Link to={`/profile/${displayPost.user.username}`} className='font-bold hover:underline'>
									{displayPost.user.fullName}
								</Link>
								<p className='text-base-content/50 text-sm'>@{displayPost.user.username}</p>
							</div>
							{isMyPost && (
								<span>
									{!isDeleting ? (
										<FaTrash className='w-4 h-4 cursor-pointer hover:text-red-500' onClick={() => deletePost()} />
									) : (
										<LoadingSpinner size='sm' />
									)}
								</span>
							)}
						</div>

						{displayPost.text && <p className='mt-3 text-lg'>{displayPost.text}</p>}

						{displayPost.img && (
							<img
								src={displayPost.img}
								className='mt-3 rounded-xl border border-base-300 w-full object-contain max-h-[500px]'
								alt=''
							/>
						)}

						<p className='text-base-content/50 text-sm mt-3'>{formattedDate}</p>

						{/* Stats row — clickable for likers/retweeters */}
						<div className='flex gap-4 mt-3 pt-3 border-t border-base-300 text-sm'>
							<button
								className='hover:underline'
								onClick={() => { if (displayPost.retweets?.length > 0) setUserListModal("retweets"); }}
							>
								<span className='font-bold'>{displayPost.retweets?.length || 0}</span>{" "}
								<span className='text-base-content/50'>Retweets</span>
							</button>
							<button
								className='hover:underline'
								onClick={() => { if (displayPost.likes?.length > 0) setUserListModal("likes"); }}
							>
								<span className='font-bold'>{displayPost.likes?.length || 0}</span>{" "}
								<span className='text-base-content/50'>Likes</span>
							</button>
							<span>
								<span className='font-bold'>{displayPost.comments?.length || 0}</span>{" "}
								<span className='text-base-content/50'>Comments</span>
							</span>
						</div>

						{/* Action row */}
						<div className='flex gap-6 mt-3 pt-3 border-t border-base-300'>
							<div className='flex gap-1 items-center group cursor-pointer' onClick={() => { if (!isLiking) likePost(); }}>
								{isLiking && <LoadingSpinner size='sm' />}
								{!isLiked && !isLiking && <FaRegHeart className='w-5 h-5 text-base-content/50 group-hover:text-pink-500' />}
								{isLiked && !isLiking && <FaHeart className='w-5 h-5 text-pink-500' />}
								<span className={`text-sm group-hover:text-pink-500 ${isLiked ? "text-pink-500" : "text-base-content/50"}`}>Like</span>
							</div>

							<div className='flex gap-1 items-center group cursor-pointer' onClick={() => { if (!isRetweeting) retweetPost(); }}>
								{isRetweeting ? <LoadingSpinner size='sm' /> : (
									<BiRepost className={`w-6 h-6 group-hover:text-green-500 ${isRetweeted ? "text-green-500" : "text-base-content/50"}`} />
								)}
								<span className={`text-sm group-hover:text-green-500 ${isRetweeted ? "text-green-500" : "text-base-content/50"}`}>Retweet</span>
							</div>

							<div className='flex gap-1 items-center group cursor-pointer' onClick={() => { if (!isBookmarking) bookmarkPost(); }}>
								{isBookmarking ? <LoadingSpinner size='sm' /> : isBookmarked ? (
									<FaBookmark className='w-5 h-5 text-primary' />
								) : (
									<FaRegBookmark className='w-5 h-5 text-base-content/50 group-hover:text-primary' />
								)}
								<span className={`text-sm group-hover:text-primary ${isBookmarked ? "text-primary" : "text-base-content/50"}`}>Bookmark</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Comment input */}
			<div className='p-4 border-b border-base-300 flex gap-3'>
				<div className='avatar'>
					<div className='w-9 rounded-full'>
						<Avatar src={authUser.profileImg || "/avatar-placeholder.png"} />
					</div>
				</div>
				<form
					className='flex flex-1 gap-2 items-center'
					onSubmit={(e) => { e.preventDefault(); if (!isCommenting) commentPost(); }}
				>
					<textarea
						className='textarea flex-1 p-2 rounded-lg text-sm resize-none border border-base-300 focus:outline-none bg-base-100'
						placeholder='Post your reply...'
						value={comment}
						rows={1}
						onChange={(e) => setComment(e.target.value)}
					/>
					<button className='btn btn-primary rounded-full btn-sm text-white px-4'>
						{isCommenting ? <LoadingSpinner size='sm' /> : "Reply"}
					</button>
				</form>
			</div>

			{/* Comments list — with full edit/delete/reply/nested replies */}
			<div className='flex flex-col'>
				{displayPost.comments?.length === 0 && (
					<p className='text-center text-base-content/50 my-6'>No replies yet. Be the first!</p>
				)}
				{displayPost.comments?.map((c) => (
					<div key={c._id} className='p-4 border-b border-base-300'>
						<CommentRow
							comment={c}
							postId={displayPost._id}
							authUser={authUser}
							onPostUpdated={updateCachedPost}
						/>
					</div>
				))}
			</div>
		</div>
	);
};

export default PostDetailPage;
