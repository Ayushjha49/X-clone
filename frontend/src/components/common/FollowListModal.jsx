import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IoClose } from "react-icons/io5";
import LoadingSpinner from "./LoadingSpinner.jsx";
import Avatar from "./Avatar.jsx";
import useFollow from "../../hooks/useFollow.jsx";

const FollowListModal = ({ username, type, onClose }) => {
	const queryClient = useQueryClient();
	const { data: authUser } = useQuery({ queryKey: ["authUser"] });
	const { follow, isFollowPending } = useFollow();

	const { data: users, isLoading } = useQuery({
		queryKey: ["followList", username, type],
		queryFn: async () => {
			const res = await fetch(`/api/users/${username}/${type}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		enabled: !!username && !!type,
	});

	// Derive follow state from authUser.following (kept in sync by useFollow optimistic update)
	const amIFollowing = (userId) => authUser?.following?.includes(userId);
	const isMe = (userId) => authUser?._id === userId;

	const handleFollow = (userId) => {
		follow(userId);
		// Also patch the followList cache optimistically so button updates instantly
		queryClient.setQueryData(["followList", username, type], (old) => {
			if (!old) return old;
			return old.map((u) => {
				if (u._id !== userId) return u;
				const alreadyFollowing = authUser?.following?.includes(userId);
				const updatedFollowers = alreadyFollowing
					? u.followers.filter((id) => id !== authUser._id)
					: [...(u.followers || []), authUser._id];
				return { ...u, followers: updatedFollowers };
			});
		});
	};

	const getButtonLabel = (user) => {
		if (isFollowPending(user._id)) return <LoadingSpinner size='sm' />;
		if (amIFollowing(user._id)) return "Following";
		if (type === "followers") return "Follow back";
		return "Follow";
	};

	const getButtonClass = (user) => {
		const base = "btn btn-sm rounded-full min-w-[100px]";
		if (amIFollowing(user._id)) return `${base} btn-outline`;
		return `${base} bg-base-content text-base-100 hover:bg-base-content/80`;
	};

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'
			onClick={onClose}
		>
			<div
				className='bg-base-100 rounded-xl w-full max-w-sm mx-4 max-h-[70vh] flex flex-col border border-base-300'
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className='flex items-center justify-between p-4 border-b border-base-300'>
					<p className='font-bold text-lg capitalize'>{type}</p>
					<button onClick={onClose} className='hover:text-base-content/60'>
						<IoClose className='w-5 h-5' />
					</button>
				</div>

				{/* Body */}
				<div className='overflow-y-auto flex-1'>
					{isLoading && (
						<div className='flex justify-center items-center py-8'>
							<LoadingSpinner size='md' />
						</div>
					)}

					{!isLoading && users?.length === 0 && (
						<p className='text-center text-base-content/50 py-8'>
							{type === "followers" ? "No followers yet" : "Not following anyone yet"}
						</p>
					)}

					{!isLoading && users?.map((user) => (
						<div
							key={user._id}
							className='flex items-center justify-between px-4 py-3 hover:bg-base-200 transition duration-200'
						>
							<Link
								to={`/profile/${user.username}`}
								className='flex items-center gap-3 flex-1 min-w-0'
								onClick={onClose}
							>
								<div className='avatar flex-shrink-0'>
									<div className='w-10 rounded-full'>
										<Avatar src={user.profileImg || "/avatar-placeholder.png"} />
									</div>
								</div>
								<div className='flex flex-col min-w-0'>
									<span className='font-bold text-sm truncate'>{user.fullName}</span>
									<span className='text-base-content/50 text-sm truncate'>@{user.username}</span>
								</div>
							</Link>

							{/* No button for yourself */}
							{!isMe(user._id) && (
								<button
									className={getButtonClass(user)}
									onClick={() => handleFollow(user._id)}
									disabled={isFollowPending(user._id)}
								>
									{getButtonLabel(user)}
								</button>
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default FollowListModal;
