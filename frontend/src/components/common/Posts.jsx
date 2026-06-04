import { useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Post from "./Post";
import PostSkeleton from "../skeletons/PostSkeleton.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";

const Posts = ({ feedType, username, userId }) => {
	const sentinelRef = useRef(null);

	const getPostEndpoint = (cursor) => {
		const cursorParam = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
		switch (feedType) {
			case "forYou":      return `/api/posts/all${cursorParam}`;
			case "following":   return `/api/posts/following${cursorParam}`;
			case "posts":       return `/api/posts/user/${username}${cursorParam}`;
			case "likes":       return `/api/posts/likes/${userId}${cursorParam}`;
			default:            return `/api/posts/all${cursorParam}`;
		}
	};

	const {
		data,
		isLoading,
		isFetchingNextPage,
		fetchNextPage,
		hasNextPage,
		refetch,
		isRefetching,
	} = useInfiniteQuery({
		queryKey: ["posts", feedType, username, userId],
		queryFn: async ({ pageParam }) => {
			const res = await fetch(getPostEndpoint(pageParam));
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data; // { posts, nextCursor }
		},
		initialPageParam: null,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
		staleTime: 30 * 1000,
	});

	// Refetch from scratch when feedType/username/userId changes
	useEffect(() => {
		refetch();
	}, [feedType, username, userId, refetch]);

	// IntersectionObserver — fires fetchNextPage when sentinel scrolls into view
	const handleObserver = useCallback(
		(entries) => {
			const [entry] = entries;
			if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
				fetchNextPage();
			}
		},
		[fetchNextPage, hasNextPage, isFetchingNextPage]
	);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) return;
		const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [handleObserver]);

	const allPosts = data?.pages.flatMap((page) => page.posts) ?? [];
	const isEmpty = !isLoading && !isRefetching && allPosts.length === 0;

	return (
		<>
			{(isLoading || isRefetching) && (
				<div className='flex flex-col justify-center'>
					<PostSkeleton />
					<PostSkeleton />
					<PostSkeleton />
				</div>
			)}

			{isEmpty && (
				<p className='text-center my-4'>No posts in this tab. Switch 👻</p>
			)}

			{!isLoading && !isRefetching && (
				<div>
					{allPosts.map((post) => (
						<Post key={post._id} post={post} />
					))}
				</div>
			)}

			{/* Sentinel div — IntersectionObserver watches this */}
			<div ref={sentinelRef} className='h-4' />

			{isFetchingNextPage && (
				<div className='flex justify-center py-4'>
					<LoadingSpinner size='md' />
				</div>
			)}

			{!hasNextPage && allPosts.length > 0 && !isLoading && (
				<p className='text-center text-base-content/40 text-sm py-6'>You&apos;re all caught up!</p>
			)}
		</>
	);
};

export default Posts;
