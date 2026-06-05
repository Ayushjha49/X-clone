import { Link } from "react-router-dom";
import { IoClose } from "react-icons/io5";
import { useQuery } from "@tanstack/react-query";
import Avatar from "./Avatar.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";

const UserListModal = ({ postId, type, onClose }) => {
	const { data: users, isLoading } = useQuery({
		queryKey: ["postUsers", postId, type],
		queryFn: async () => {
			const res = await fetch(`/api/posts/${postId}/${type === "likes" ? "likers" : "retweeters"}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		enabled: !!postId,
	});

	const title = type === "likes" ? "Liked by" : "Retweeted by";

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'
			onClick={onClose}
		>
			<div
				className='bg-base-100 rounded-xl w-full max-w-sm mx-4 max-h-[70vh] flex flex-col border border-base-300'
				onClick={(e) => e.stopPropagation()}
			>
				<div className='flex items-center justify-between p-4 border-b border-base-300'>
					<p className='font-bold text-lg'>{title}</p>
					<button onClick={onClose} className='hover:text-base-content/60'>
						<IoClose className='w-5 h-5' />
					</button>
				</div>
				<div className='overflow-y-auto flex-1'>
					{isLoading && (
						<div className='flex justify-center items-center py-8'>
							<LoadingSpinner size='md' />
						</div>
					)}
					{!isLoading && users?.length === 0 && (
						<p className='text-center text-base-content/50 py-8'>
							{type === "likes" ? "No likes yet" : "No retweets yet"}
						</p>
					)}
					{!isLoading && users?.map((user) => (
						<Link
							key={user._id}
							to={`/profile/${user.username}`}
							className='flex items-center gap-3 px-4 py-3 hover:bg-base-200 transition duration-200'
							onClick={onClose}
						>
							<div className='avatar'>
								<div className='w-10 rounded-full'>
									<Avatar src={user.profileImg || "/avatar-placeholder.png"} />
								</div>
							</div>
							<div className='flex flex-col'>
								<span className='font-bold text-sm'>{user.fullName}</span>
								<span className='text-base-content/50 text-sm'>@{user.username}</span>
							</div>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
};

export default UserListModal;
