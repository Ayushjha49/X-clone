import { useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { MdReply } from "react-icons/md";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import Avatar from "./Avatar.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";

const CommentRow = ({ comment, postId, authUser, onPostUpdated }) => {
	const [editing, setEditing] = useState(false);
	const [editText, setEditText] = useState(comment.text);
	const [showReply, setShowReply] = useState(false);
	const [replyText, setReplyText] = useState("");
	const [showReplies, setShowReplies] = useState(false);
	const isMyComment = authUser._id === comment.user._id;

	const { mutate: editComment, isPending: isEditing } = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/posts/comment/${postId}/${comment._id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: editText }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		onSuccess: (updatedPost) => { setEditing(false); onPostUpdated(updatedPost); },
		onError: (e) => toast.error(e.message),
	});

	const { mutate: deleteComment, isPending: isDeleting } = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/posts/comment/${postId}/${comment._id}`, { method: "DELETE" });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		onSuccess: (updatedPost) => onPostUpdated(updatedPost),
		onError: (e) => toast.error(e.message),
	});

	const { mutate: submitReply, isPending: isReplying } = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/posts/comment/${postId}/${comment._id}/reply`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: replyText }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		onSuccess: (updatedPost) => {
			setReplyText("");
			setShowReply(false);
			setShowReplies(true);
			onPostUpdated(updatedPost);
		},
		onError: (e) => toast.error(e.message),
	});

	return (
		<div className='flex flex-col gap-1'>
			<div className='flex gap-2 items-start'>
				<div className='avatar'>
					<div className='w-8 rounded-full'>
						<Avatar src={comment.user.profileImg || "/avatar-placeholder.png"} />
					</div>
				</div>
				<div className='flex flex-col flex-1'>
					<div className='flex items-center gap-1 justify-between'>
						<div className='flex items-center gap-1'>
							<span className='font-bold text-sm'>{comment.user.fullName}</span>
							<span className='text-base-content/50 text-xs'>@{comment.user.username}</span>
						</div>
						{isMyComment && (
							<div className='flex gap-2 items-center'>
								{isDeleting ? <LoadingSpinner size='sm' /> : (
									<>
										<FaEdit
											className='w-3 h-3 text-base-content/40 hover:text-primary cursor-pointer'
											onClick={() => { setEditing(true); setEditText(comment.text); }}
										/>
										<FaTrash
											className='w-3 h-3 text-base-content/40 hover:text-red-500 cursor-pointer'
											onClick={() => deleteComment()}
										/>
									</>
								)}
							</div>
						)}
					</div>

					{editing ? (
						<div className='flex gap-2 mt-1'>
							<textarea
								className='textarea textarea-sm w-full resize-none border border-base-300 bg-base-100 text-sm focus:outline-none'
								value={editText}
								onChange={(e) => setEditText(e.target.value)}
								rows={2}
							/>
							<div className='flex flex-col gap-1'>
								<button
									className='btn btn-primary btn-xs rounded-full'
									onClick={() => editComment()}
									disabled={isEditing || !editText.trim()}
								>
									{isEditing ? <LoadingSpinner size='sm' /> : "Save"}
								</button>
								<button className='btn btn-ghost btn-xs rounded-full' onClick={() => setEditing(false)}>
									Cancel
								</button>
							</div>
						</div>
					) : (
						<p className='text-sm mt-0.5'>{comment.text}</p>
					)}

					<div className='flex items-center gap-3 mt-1'>
						<button
							className='text-xs text-base-content/40 hover:text-sky-400 flex items-center gap-1'
							onClick={() => setShowReply(!showReply)}
						>
							<MdReply className='w-3 h-3' /> Reply
						</button>
						{comment.replies?.length > 0 && (
							<button
								className='text-xs text-base-content/40 hover:text-primary'
								onClick={() => setShowReplies(!showReplies)}
							>
								{showReplies ? "Hide replies" : `${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}`}
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Reply input */}
			{showReply && (
				<div className='ml-10 flex gap-2 mt-1'>
					<textarea
						className='textarea textarea-sm w-full resize-none border border-base-300 bg-base-100 text-sm focus:outline-none'
						placeholder='Write a reply...'
						value={replyText}
						onChange={(e) => setReplyText(e.target.value)}
						rows={2}
					/>
					<div className='flex flex-col gap-1'>
						<button
							className='btn btn-primary btn-xs rounded-full'
							onClick={() => submitReply()}
							disabled={isReplying || !replyText.trim()}
						>
							{isReplying ? <LoadingSpinner size='sm' /> : "Reply"}
						</button>
						<button className='btn btn-ghost btn-xs rounded-full' onClick={() => setShowReply(false)}>
							Cancel
						</button>
					</div>
				</div>
			)}

			{/* Replies list */}
			{showReplies && comment.replies?.length > 0 && (
				<div className='ml-10 flex flex-col gap-2 mt-1 border-l-2 border-base-300 pl-3'>
					{comment.replies.map((reply, idx) => (
						<div key={idx} className='flex gap-2 items-start'>
							<div className='avatar'>
								<div className='w-6 rounded-full'>
									<Avatar src={reply.user?.profileImg || "/avatar-placeholder.png"} />
								</div>
							</div>
							<div className='flex flex-col'>
								<div className='flex items-center gap-1'>
									<span className='font-bold text-xs'>{reply.user?.fullName}</span>
									<span className='text-base-content/50 text-xs'>@{reply.user?.username}</span>
								</div>
								<p className='text-xs mt-0.5'>{reply.text}</p>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default CommentRow;
