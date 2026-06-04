import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FaArrowLeft, FaRegHeart, FaHeart, FaRegBookmark, FaBookmark } from "react-icons/fa";
import { FaRegComment } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { FaTrash } from "react-icons/fa";
import { toast } from "react-hot-toast";

import LoadingSpinner from "../../components/common/LoadingSpinner.jsx";
import useRelativeTime from "../../hooks/useRelativeTime.js";
import { formatMemberSinceDate } from "../../utils/date/index.js";

const PostDetailPage = () => {
	const { id } = useParams();
	const [comment, setComment] = useState("");
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
				const target = old.isRetweet ? old.originalPost : old;
				if (old.isRetweet) return { ...old, originalPost: { ...target, likes: updatedLikes } };
				return { ...old, likes: updatedLikes };
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
			queryClient.invalidateQueries({ queryKey: ["post", id] });
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
			setComment("");
			queryClient.setQueryData(["post", id], (old) => {
				if (!old) return old;
				if (old.isRetweet) return { ...old, originalPost: { ...old.originalPost, comments: updatedPost.comments } };
				return { ...old, comments: updatedPost.comments };
			});
		},
		onError: (error) => { toast.error(error.message); },
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
								<img src={displayPost.user.profileImg || "/avatar-placeholder.png"} />
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

						{/* Full post text */}
						{displayPost.text && <p className='mt-3 text-lg'>{displayPost.text}</p>}

						{/* Image */}
						{displayPost.img && (
							<img
								src={displayPost.img}
								className='mt-3 rounded-xl border border-base-300 w-full object-contain max-h-[500px]'
								alt=''
							/>
						)}

						{/* Timestamp */}
						<p className='text-base-content/50 text-sm mt-3'>{formattedDate}</p>

						{/* Stats row */}
						<div className='flex gap-4 mt-3 pt-3 border-t border-base-300 text-sm'>
							<span><span className='font-bold'>{displayPost.retweets?.length || 0}</span> <span className='text-base-content/50'>Retweets</span></span>
							<span><span className='font-bold'>{displayPost.likes?.length || 0}</span> <span className='text-base-content/50'>Likes</span></span>
							<span><span className='font-bold'>{displayPost.comments?.length || 0}</span> <span className='text-base-content/50'>Comments</span></span>
						</div>

						{/* Action row */}
						<div className='flex gap-6 mt-3 pt-3 border-t border-base-300'>
							{/* Like */}
							<div className='flex gap-1 items-center group cursor-pointer' onClick={() => { if (!isLiking) likePost(); }}>
								{isLiking && <LoadingSpinner size='sm' />}
								{!isLiked && !isLiking && <FaRegHeart className='w-5 h-5 text-base-content/50 group-hover:text-pink-500' />}
								{isLiked && !isLiking && <FaHeart className='w-5 h-5 text-pink-500' />}
								<span className={`text-sm group-hover:text-pink-500 ${isLiked ? "text-pink-500" : "text-base-content/50"}`}>
									Like
								</span>
							</div>

							{/* Retweet */}
							<div className='flex gap-1 items-center group cursor-pointer' onClick={() => { if (!isRetweeting) retweetPost(); }}>
								{isRetweeting ? <LoadingSpinner size='sm' /> : (
									<BiRepost className={`w-6 h-6 group-hover:text-green-500 ${isRetweeted ? "text-green-500" : "text-base-content/50"}`} />
								)}
								<span className={`text-sm group-hover:text-green-500 ${isRetweeted ? "text-green-500" : "text-base-content/50"}`}>
									Retweet
								</span>
							</div>

							{/* Bookmark */}
							<div className='flex gap-1 items-center group cursor-pointer' onClick={() => { if (!isBookmarking) bookmarkPost(); }}>
								{isBookmarking ? <LoadingSpinner size='sm' /> : isBookmarked ? (
									<FaBookmark className='w-5 h-5 text-primary' />
								) : (
									<FaRegBookmark className='w-5 h-5 text-base-content/50 group-hover:text-primary' />
								)}
								<span className={`text-sm group-hover:text-primary ${isBookmarked ? "text-primary" : "text-base-content/50"}`}>
									Bookmark
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Comment input */}
			<div className='p-4 border-b border-base-300 flex gap-3'>
				<div className='avatar'>
					<div className='w-9 rounded-full'>
						<img src={authUser.profileImg || "/avatar-placeholder.png"} />
					</div>
				</div>
				<form className='flex flex-1 gap-2 items-center' onSubmit={(e) => { e.preventDefault(); if (!isCommenting) commentPost(); }}>
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

			{/* Comments list */}
			<div className='flex flex-col'>
				{displayPost.comments?.length === 0 && (
					<p className='text-center text-base-content/50 my-6'>No replies yet. Be the first!</p>
				)}
				{displayPost.comments?.map((c) => (
					<div key={c._id} className='flex gap-3 p-4 border-b border-base-300'>
						<Link to={`/profile/${c.user.username}`}>
							<div className='avatar'>
								<div className='w-9 rounded-full'>
									<img src={c.user.profileImg || "/avatar-placeholder.png"} />
								</div>
							</div>
						</Link>
						<div className='flex flex-col'>
							<div className='flex items-center gap-2'>
								<Link to={`/profile/${c.user.username}`} className='font-bold hover:underline'>{c.user.fullName}</Link>
								<span className='text-base-content/50 text-sm'>@{c.user.username}</span>
							</div>
							<p className='text-sm mt-1'>{c.text}</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default PostDetailPage;
