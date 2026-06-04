import { useState, useEffect } from "react";

const useTheme = () => {
	const [theme, setTheme] = useState(() => {
		return localStorage.getItem("theme") || "black";
	});

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		localStorage.setItem("theme", theme);
	}, [theme]);

	const toggleTheme = () => {
		setTheme((prev) => (prev === "black" ? "light" : "black"));
	};

	return { theme, toggleTheme };
};

export default useTheme;
