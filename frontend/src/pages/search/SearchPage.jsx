import { useState } from "react";
import { Link } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import { useQuery } from "@tanstack/react-query";
import Post from "../../components/common/Post.jsx";
import PostSkeleton from "../../components/skeletons/PostSkeleton.jsx";
import LoadingSpinner from "../../components/common/LoadingSpinner.jsx";

const SearchPage = () => {
	const [query, setQuery] = useState("");
	const [submitted, setSubmitted] = useState("");
	const [tab, setTab] = useState("users");

	const { data: users, isFetching: usersLoading } = useQuery({
		queryKey: ["searchUsers", submitted],
		queryFn: async () => {
			if (!submitted) return [];
			const res = await fetch(`/api/users/search?q=${encodeURIComponent(submitted)}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		enabled: !!submitted,
	});

	const { data: posts, isFetching: postsLoading } = useQuery({
		queryKey: ["searchPosts", submitted],
		queryFn: async () => {
			if (!submitted) return [];
			const res = await fetch(`/api/posts/search?q=${encodeURIComponent(submitted)}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		enabled: !!submitted,
	});

	const handleSearch = (e) => {
		e.preventDefault();
		if (query.trim()) setSubmitted(query.trim());
	};

	return (
		<div className='flex-[4_4_0] border-r border-base-300 min-h-screen'>
			<div className='p-4 border-b border-base-300'>
				<p className='font-bold text-lg mb-3'>Search</p>
				<form onSubmit={handleSearch} className='flex gap-2'>
					<div className='flex items-center gap-2 bg-base-200 rounded-full px-4 py-2 flex-1'>
						<FiSearch className='text-slate-500 w-4 h-4' />
						<input
							type='text'
							placeholder='Search users or posts...'
							className='bg-transparent outline-none w-full text-sm'
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
					</div>
					<button type='submit' className='btn btn-primary btn-sm rounded-full text-white px-4'>
						Search
					</button>
				</form>
			</div>

			{submitted && (
				<>
					<div className='flex border-b border-base-300'>
						<div
							className={`flex justify-center flex-1 p-3 cursor-pointer hover:bg-base-200 transition duration-300 relative ${tab === "users" ? "font-semibold" : "text-base-content/50"}`}
							onClick={() => setTab("users")}
						>
							Users
							{tab === "users" && <div className='absolute bottom-0 w-10 h-1 rounded-full bg-primary' />}
						</div>
						<div
							className={`flex justify-center flex-1 p-3 cursor-pointer hover:bg-base-200 transition duration-300 relative ${tab === "posts" ? "font-semibold" : "text-base-content/50"}`}
							onClick={() => setTab("posts")}
						>
							Posts
							{tab === "posts" && <div className='absolute bottom-0 w-10 h-1 rounded-full bg-primary' />}
						</div>
					</div>

					{tab === "users" && (
						<div>
							{usersLoading && (
								<div className='flex justify-center mt-4'>
									<LoadingSpinner size='md' />
								</div>
							)}
							{!usersLoading && users?.length === 0 && (
								<p className='text-center my-4 text-slate-500'>No users found for "{submitted}"</p>
							)}
							{!usersLoading && users?.map((user) => (
								<Link
									to={`/profile/${user.username}`}
									key={user._id}
									className='flex items-center gap-3 p-4 border-b border-base-300 hover:bg-base-200 transition duration-200'
								>
									<div className='avatar'>
										<div className='w-10 rounded-full'>
											<img src={user.profileImg || "/avatar-placeholder.png"} />
										</div>
									</div>
									<div>
										<p className='font-bold'>{user.fullName}</p>
										<p className='text-slate-500 text-sm'>@{user.username}</p>
										{user.bio && <p className='text-sm mt-1'>{user.bio}</p>}
									</div>
								</Link>
							))}
						</div>
					)}

					{tab === "posts" && (
						<div>
							{postsLoading && (
								<div className='flex flex-col'>
									<PostSkeleton />
									<PostSkeleton />
								</div>
							)}
							{!postsLoading && posts?.length === 0 && (
								<p className='text-center my-4 text-slate-500'>No posts found for "{submitted}"</p>
							)}
							{!postsLoading && posts?.map((post) => (
								<Post key={post._id} post={post} />
							))}
						</div>
					)}
				</>
			)}

			{!submitted && (
				<p className='text-center mt-10 text-slate-500'>Search for users or posts above</p>
			)}
		</div>
	);
};

export default SearchPage;
