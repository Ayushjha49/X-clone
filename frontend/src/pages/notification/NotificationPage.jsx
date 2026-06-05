import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import LoadingSpinner from "../../components/common/LoadingSpinner.jsx";
import { toast } from "react-hot-toast";

import { IoSettingsOutline, IoClose } from "react-icons/io5";
import { FaUser, FaRetweet, FaBookmark } from "react-icons/fa";
import { FaHeart, FaComment } from "react-icons/fa6";
import Avatar from "../../components/common/Avatar.jsx";

const notificationConfig = {
    follow:   { icon: <FaUser className='w-6 h-6 text-primary' />,   text: "followed you" },
    like:     { icon: <FaHeart className='w-6 h-6 text-red-500' />,   text: "liked your post" },
    retweet:  { icon: <FaRetweet className='w-6 h-6 text-green-500' />, text: "retweeted your post" },
    bookmark: { icon: <FaBookmark className='w-6 h-6 text-blue-400' />, text: "bookmarked your post" },
    comment:  { icon: <FaComment className='w-6 h-6 text-sky-400' />,  text: "commented on your post" },
};

const NotificationPage = () => {
    const queryClient = useQueryClient();

    const { data: notifications, isLoading } = useQuery({
        queryKey: ["notifications"],
        queryFn: async () => {
            try {
                const res = await fetch("/api/notifications");
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Something went wrong");
                queryClient.invalidateQueries({ queryKey: ["unreadNotifications"] });
                return data;
            } catch (error) {
                throw new Error(error);
            }
        },
    });

    const { mutate: deleteNotifications } = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/notifications", { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Something went wrong");
            return data;
        },
        onSuccess: () => {
            toast.success("Notifications deleted successfully");
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["unreadNotifications"] });
        },
        onError: (error) => toast.error(error.message),
    });

    const { mutate: deleteOne } = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Something went wrong");
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["unreadNotifications"] });
        },
        onError: (error) => toast.error(error.message),
    });

    return (
        <>
            <div className='flex-[4_4_0] border-l border-r border-base-300 min-h-screen'>
                <div className='flex justify-between items-center p-4 border-b border-base-300'>
                    <p className='font-bold'>Notifications</p>
                    <div className='dropdown'>
                        <div tabIndex={0} role='button' className='m-1'>
                            <IoSettingsOutline className='w-4' />
                        </div>
                        <ul
                            tabIndex={0}
                            className='dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52'
                        >
                            <li>
                                <a onClick={deleteNotifications}>Delete all notifications</a>
                            </li>
                        </ul>
                    </div>
                </div>

                {isLoading && (
                    <div className='flex justify-center h-full items-center'>
                        <LoadingSpinner size='lg' />
                    </div>
                )}
                {notifications?.length === 0 && (
                    <div className='text-center p-4 font-bold'>No notifications 🤔</div>
                )}
                {notifications?.map((notification) => {
                    const config = notificationConfig[notification.type];
                    return (
                        <div className='flex items-center justify-between border-b border-base-300 pr-4' key={notification._id}>
                            <div className='flex gap-3 p-4 flex-1 items-center'>
                                {config?.icon}
                                <Link to={`/profile/${notification.from.username}`} className='flex items-center gap-2'>
                                    <div className='avatar'>
                                        <div className='w-8 rounded-full'>
                                            <Avatar src={notification.from.profileImg || "/avatar-placeholder.png"} />
                                        </div>
                                    </div>
                                    <span>
                                        <span className='font-bold'>@{notification.from.username}</span>{" "}
                                        {config?.text}
                                    </span>
                                </Link>
                            </div>
                            <IoClose
                                className='w-5 h-5 text-base-content/50 hover:text-red-500 cursor-pointer flex-shrink-0'
                                onClick={() => deleteOne(notification._id)}
                            />
                        </div>
                    );
                })}
            </div>
        </>
    );
};
export default NotificationPage;
