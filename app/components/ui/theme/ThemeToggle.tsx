"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
	const { theme, toggleTheme, mounted } = useTheme();

	// don't render anything until mounted to prevent flash
	if (!mounted) {
		return <div className="w-10 h-5" />;
	}

	const isDark = theme === "dark";

	return (
		<button
			onClick={toggleTheme}
			className="cursor-pointer flex items-center"
			aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
			style={{ width: 40, height: 20 }}
		>
			<span
				aria-hidden
				style={{
					display: "block",
					width: 20,
					height: 20,
					backgroundColor: "var(--foreground)",
					opacity: isDark ? 1 : 0.5,
					transition:
						"opacity var(--transition-duration) var(--transition-timing)",
				}}
			/>
			<span
				aria-hidden
				style={{
					display: "block",
					width: 20,
					height: 20,
					backgroundColor: "var(--foreground)",
					opacity: isDark ? 0.5 : 1,
					transition:
						"opacity var(--transition-duration) var(--transition-timing)",
				}}
			/>
		</button>
	);
}
