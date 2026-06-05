import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import { useQuery } from "@tanstack/react-query";
import Post from "../../components/common/Post.jsx";
import PostSkeleton from "../../components/skeletons/PostSkeleton.jsx";
import LoadingSpinner from "../../components/common/LoadingSpinner.jsx";
import Avatar from "../../components/common/Avatar.jsx";

const SearchPage = () => {
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");

	// Debounce: update debouncedQuery 400ms after the user stops typing
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(query.trim());
		}, 400);
		return () => clearTimeout(timer);
	}, [query]);

	const { data: users, isFetching: usersLoading } = useQuery({
		queryKey: ["searchUsers", debouncedQuery],
		queryFn: async () => {
			const res = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery)}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		enabled: !!debouncedQuery,
	});

	const { data: posts, isFetching: postsLoading } = useQuery({
		queryKey: ["searchPosts", debouncedQuery],
		queryFn: async () => {
			const res = await fetch(`/api/posts/search?q=${encodeURIComponent(debouncedQuery)}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		enabled: !!debouncedQuery,
	});

	const isLoading = usersLoading || postsLoading;
	const hasUsers = users && users.length > 0;
	const hasPosts = posts && posts.length > 0;
	const noResults = !isLoading && debouncedQuery && !hasUsers && !hasPosts;

	return (
		<div className='flex-[4_4_0] border-r border-base-300 min-h-screen'>
			{/* Search bar */}
			<div className='p-4 border-b border-base-300 sticky top-0 bg-base-100 z-10'>
				<p className='font-bold text-lg mb-3'>Search</p>
				<div className='flex items-center gap-2 bg-base-200 rounded-full px-4 py-2'>
					<FiSearch className='text-slate-500 w-4 h-4 flex-shrink-0' />
					<input
						type='text'
						placeholder='Search users or posts...'
						className='bg-transparent outline-none w-full text-sm'
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
					{isLoading && <LoadingSpinner size='sm' />}
				</div>
			</div>

			{/* Empty state */}
			{!debouncedQuery && (
				<p className='text-center mt-10 text-slate-500'>Search for users or posts above</p>
			)}

			{/* No results */}
			{noResults && (
				<p className='text-center my-4 text-slate-500'>
					No results found for &quot;{debouncedQuery}&quot;
				</p>
			)}

			{debouncedQuery && (
				<>
					{/* ── People section ── */}
					{(hasUsers || usersLoading) && (
						<div className='border-b border-base-300'>
							<p className='px-4 pt-4 pb-2 font-bold text-base'>People</p>

							{usersLoading && (
								<div className='flex justify-center py-4'>
									<LoadingSpinner size='md' />
								</div>
							)}

							{!usersLoading && hasUsers && (
								<div className='flex gap-3 px-4 pb-4 overflow-x-auto'>
									{users.map((user) => (
										<Link
											to={`/profile/${user.username}`}
											key={user._id}
											className='flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-base-200 transition duration-200 min-w-[90px] text-center flex-shrink-0'
										>
											<div className='avatar'>
												<div className='w-12 rounded-full'>
													<Avatar src={user.profileImg || "/avatar-placeholder.png"} />
												</div>
											</div>
											<p className='font-semibold text-sm leading-tight line-clamp-1 w-full'>
												{user.fullName}
											</p>
											<p className='text-slate-500 text-xs'>@{user.username}</p>
										</Link>
									))}
								</div>
							)}
						</div>
					)}

					{/* ── Posts section ── */}
					{(hasPosts || postsLoading) && (
						<div>
							<p className='px-4 pt-4 pb-2 font-bold text-base'>Posts</p>

							{postsLoading && (
								<div className='flex flex-col'>
									<PostSkeleton />
									<PostSkeleton />
								</div>
							)}

							{!postsLoading && hasPosts && (
								<div>
									{posts.map((post) => (
										<Post key={post._id} post={post} />
									))}
								</div>
							)}
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default SearchPage;
