import { useState, useEffect } from "react";
import { formatPostDate } from "../utils/date/index.js";

// Re-renders the timestamp every minute so "2m ago" updates live
const useRelativeTime = (createdAt) => {
	const [label, setLabel] = useState(() => formatPostDate(createdAt));

	useEffect(() => {
		setLabel(formatPostDate(createdAt));
		const interval = setInterval(() => {
			setLabel(formatPostDate(createdAt));
		}, 60 * 1000); // update every minute
		return () => clearInterval(interval);
	}, [createdAt]);

	return label;
};

export default useRelativeTime;
