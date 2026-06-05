import { useState } from "react";

const Avatar = ({ src, fallback = "/avatar-placeholder.png", alt = "", className = "", onClick }) => {
	const [failed, setFailed] = useState(false);
	const imgSrc = failed || !src ? fallback : src;

	return (
		<img
			src={imgSrc}
			alt={alt}
			className={className}
			onClick={onClick}
			onError={() => setFailed(true)}
		/>
	);
};

export default Avatar;
