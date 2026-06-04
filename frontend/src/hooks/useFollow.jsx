import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const useFollow = () => {
    const queryClient = useQueryClient();

    const { mutate: follow, isPending } = useMutation({
        mutationFn: async (userId) => {
            try {
                const res = await fetch(`/api/users/follow/${userId}`, {
                    method: "POST",
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Something went wrong");
                return data;
            } catch (error) {
                throw new Error(error.message);
            }
        },
        onSuccess: (_, userId) => {
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
            queryClient.setQueryData(["userProfile"], (oldData) => {
                if (!oldData) return oldData;
                const isFollowing = oldData.followers.includes(
                    queryClient.getQueryData(["authUser"])?._id
                );
                const authId = queryClient.getQueryData(["authUser"])?._id;
                const updatedFollowers = isFollowing
                    ? oldData.followers.filter((id) => id !== authId)
                    : [...oldData.followers, authId];
                return { ...oldData, followers: updatedFollowers };
            });

            // Suggested users list needs a real refetch
            queryClient.invalidateQueries({ queryKey: ["suggestedUsers"] });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    return { follow, isPending };
};

export default useFollow;
