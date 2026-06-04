import { useState } from "react";
import Posts from "../../components/common/Posts.jsx";
import CreatePost from "./CreatePost.jsx";

const HomePage = () => {
	const [feedType, setFeedType] = useState("forYou");

	return (
		<div className='flex-[4_4_0] mr-auto border-r border-base-300 min-h-screen'>
			<div className='flex w-full border-b border-base-300'>
				<div
					className={`flex justify-center flex-1 p-3 hover:bg-base-200 transition duration-300 cursor-pointer relative ${feedType === "forYou" ? "font-bold" : "text-base-content/50"}`}
					onClick={() => setFeedType("forYou")}
				>
					For you
					{feedType === "forYou" && (
						<div className='absolute bottom-0 w-10 h-1 rounded-full bg-primary' />
					)}
				</div>
				<div
					className={`flex justify-center flex-1 p-3 hover:bg-base-200 transition duration-300 cursor-pointer relative ${feedType === "following" ? "font-bold" : "text-base-content/50"}`}
					onClick={() => setFeedType("following")}
				>
					Following
					{feedType === "following" && (
						<div className='absolute bottom-0 w-10 h-1 rounded-full bg-primary' />
					)}
				</div>
			</div>
			<CreatePost />
			<Posts feedType={feedType} />
		</div>
	);
};
export default HomePage;
