import { useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Post from "../../components/common/Post.jsx";
import PostSkeleton from "../../components/skeletons/PostSkeleton.jsx";
import LoadingSpinner from "../../components/common/LoadingSpinner.jsx";

const BookmarksPage = () => {
	const sentinelRef = useRef(null);

	const {
		data,
		isLoading,
		isFetchingNextPage,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ["bookmarks"],
		queryFn: async ({ pageParam }) => {
			const url = pageParam ? `/api/bookmarks?cursor=${encodeURIComponent(pageParam)}` : "/api/bookmarks";
			const res = await fetch(url);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data; // { posts, nextCursor }
		},
		initialPageParam: null,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});

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

	const allBookmarks = data?.pages.flatMap((page) => page.posts) ?? [];

	return (
		<div className='flex-[4_4_0] border-r border-base-300 min-h-screen'>
			<div className='p-4 border-b border-base-300'>
				<p className='font-bold text-lg'>Bookmarks</p>
			</div>

			{isLoading && (
				<div className='flex flex-col'>
					<PostSkeleton />
					<PostSkeleton />
					<PostSkeleton />
				</div>
			)}

			{!isLoading && allBookmarks.length === 0 && (
				<p className='text-center my-4 text-base-content/50'>No bookmarks yet</p>
			)}

			{!isLoading && allBookmarks.map((post) => (
				<Post key={post._id} post={post} />
			))}

			<div ref={sentinelRef} className='h-4' />

			{isFetchingNextPage && (
				<div className='flex justify-center py-4'>
					<LoadingSpinner size='md' />
				</div>
			)}

			{!hasNextPage && allBookmarks.length > 0 && !isLoading && (
				<p className='text-center text-base-content/40 text-sm py-6'>You&apos;ve seen all your bookmarks!</p>
			)}
		</div>
	);
};

export default BookmarksPage;
