import XSvg from "../svgs/X.jsx";

import { MdHomeFilled } from "react-icons/md";
import { IoNotifications } from "react-icons/io5";
import { FaUser, FaBookmark } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import { MdOutlineLightMode, MdOutlineDarkMode } from "react-icons/md";
import { Link } from "react-router-dom";
import { BiLogOut } from "react-icons/bi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import useTheme from "../../hooks/useTheme.js";
import Avatar from "./Avatar.jsx";

const Sidebar = () => {
	const queryClient = useQueryClient();
	const { theme, toggleTheme } = useTheme();

	const { mutate: logout } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch("/api/auth/logout", { method: "POST" });
				const data = await res.json();
				if (!res.ok) throw new Error(data.error || "Something went wrong");
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: () => {
			toast.success("Logout successful");
			queryClient.invalidateQueries({ queryKey: ["authUser"] });
		},
		onError: () => {
			toast.error("Logout failed");
		},
	});

	const { data: authUser } = useQuery({ queryKey: ["authUser"] });

	const { data: unreadData } = useQuery({
		queryKey: ["unreadNotifications"],
		queryFn: async () => {
			const res = await fetch("/api/notifications/unread");
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
		refetchInterval: 30 * 1000, // poll every 30 seconds
	});

	const hasUnread = unreadData?.count > 0;

	const navLinkClass = "flex gap-3 items-center hover:bg-base-300 transition-all rounded-full duration-300 py-2 pl-2 pr-4 max-w-fit cursor-pointer";

	return (
		<div className='md:flex-[2_2_0] w-18 max-w-52'>
			<div className='sticky top-0 left-0 h-screen flex flex-col border-r border-base-300 w-20 md:w-full'>
				<Link to='/' className='flex justify-center md:justify-start'>
					<XSvg className='px-2 w-12 h-12 rounded-full fill-current hover:bg-base-300' />
				</Link>
				<ul className='flex flex-col gap-3 mt-4'>
					<li className='flex justify-center md:justify-start'>
						<Link to='/' className={navLinkClass}>
							<MdHomeFilled className='w-8 h-8' />
							<span className='text-lg hidden md:block'>Home</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link to='/search' className={navLinkClass}>
							<FiSearch className='w-6 h-6' />
							<span className='text-lg hidden md:block'>Search</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link to='/notifications' className={navLinkClass}>
							<div className='relative'>
								<IoNotifications className='w-6 h-6' />
								{hasUnread && (
									<span className='absolute -top-1 -right-1 min-w-[16px] h-4 bg-primary rounded-full flex items-center justify-center text-white text-[10px] font-bold px-0.5'>
										{unreadData.count > 99 ? "99+" : unreadData.count}
									</span>
								)}
							</div>
							<span className='text-lg hidden md:block'>Notifications</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link to='/bookmarks' className={navLinkClass}>
							<FaBookmark className='w-6 h-6' />
							<span className='text-lg hidden md:block'>Bookmarks</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link to={`/profile/${authUser?.username}`} className={navLinkClass}>
							<FaUser className='w-6 h-6' />
							<span className='text-lg hidden md:block'>Profile</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<button onClick={toggleTheme} className={navLinkClass}>
							{theme === "black" ? (
								<MdOutlineLightMode className='w-6 h-6' />
							) : (
								<MdOutlineDarkMode className='w-6 h-6' />
							)}
							<span className='text-lg hidden md:block'>
								{theme === "black" ? "Light mode" : "Dark mode"}
							</span>
						</button>
					</li>
				</ul>
				{authUser && (
					<Link
						to={`/profile/${authUser.username}`}
						className='mt-auto mb-10 flex gap-2 items-start transition-all duration-300 hover:bg-base-300 py-2 px-4 rounded-full'
					>
						<div className='avatar hidden md:inline-flex'>
							<div className='w-8 rounded-full'>
								<Avatar src={authUser?.profileImg || "/avatar-placeholder.png"} />
							</div>
						</div>
						<div className='flex justify-between flex-1'>
							<div className='hidden md:block'>
								<p className='font-bold text-sm w-20 truncate'>{authUser?.fullName}</p>
								<p className='text-base-content/60 text-sm'>@{authUser?.username}</p>
							</div>
							<BiLogOut
								className='w-5 h-5 cursor-pointer'
								onClick={(e) => {
									e.preventDefault();
									logout();
								}}
							/>
						</div>
					</Link>
				)}
			</div>
		</div>
	);
};
export default Sidebar;
