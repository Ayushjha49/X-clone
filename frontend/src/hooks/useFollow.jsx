import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useState } from "react";

const useFollow = () => {
    const queryClient = useQueryClient();
    const [pendingIds, setPendingIds] = useState(new Set());

    const { mutate: followMutate } = useMutation({
        mutationFn: async (userId) => {
            const res = await fetch(`/api/users/follow/${userId}`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Something went wrong");
            return { data, userId };
        },
        onMutate: (userId) => {
            setPendingIds((prev) => new Set(prev).add(userId));
        },
        onSuccess: ({ userId }) => {
            // Update authUser.following in cache instantly
            queryClient.setQueryData(["authUser"], (oldData) => {
                if (!oldData) return oldData;
                const isFollowing = oldData.following.includes(userId);
                const updatedFollowing = isFollowing
                    ? oldData.following.filter((id) => id !== userId)
                    : [...oldData.following, userId];
                return { ...oldData, following: updatedFollowing };
            });

            // Update userProfile.followers in cache instantly
            queryClient.setQueriesData({ queryKey: ["userProfile"] }, (oldData) => {
                if (!oldData) return oldData;
                const authId = queryClient.getQueryData(["authUser"])?._id;
                const isFollowing = oldData.followers.includes(authId);
                const updatedFollowers = isFollowing
                    ? oldData.followers.filter((id) => id !== authId)
                    : [...oldData.followers, authId];
                return { ...oldData, followers: updatedFollowers };
            });

            // Optimistically remove the followed user from suggested list — no refetch needed
            queryClient.setQueryData(["suggestedUsers"], (oldData) => {
                if (!oldData) return oldData;
                return oldData.filter((u) => u._id !== userId);
            });
        },
        onError: (error) => {
            toast.error(error.message);
        },
        onSettled: (_, __, userId) => {
            setPendingIds((prev) => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        },
    });

    const follow = (userId) => followMutate(userId);
    const isFollowPending = (userId) => pendingIds.has(userId);

    return { follow, isFollowPending };
};

export default useFollow;
