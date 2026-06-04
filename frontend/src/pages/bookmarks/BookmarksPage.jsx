import { useQuery } from "@tanstack/react-query";
import Post from "../../components/common/Post.jsx";
import PostSkeleton from "../../components/skeletons/PostSkeleton.jsx";

const BookmarksPage = () => {
	const { data: bookmarks, isLoading } = useQuery({
		queryKey: ["bookmarks"],
		queryFn: async () => {
			const res = await fetch("/api/bookmarks");
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
	});

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

			{!isLoading && bookmarks?.length === 0 && (
				<p className='text-center my-4 text-base-content/50'>No bookmarks yet</p>
			)}

			{!isLoading && bookmarks?.map((post) => (
				<Post key={post._id} post={post} />
			))}
		</div>
	);
};

export default BookmarksPage;
