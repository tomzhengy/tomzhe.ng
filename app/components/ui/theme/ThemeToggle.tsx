"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  // don't render anything until mounted to prevent flash
  if (!mounted) {
    return <div className="w-6 h-6" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="text-foreground cursor-pointer relative block w-6 h-6"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {/* Sun icon for dark mode */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute top-0 left-0 will-change-opacity"
        style={{
          opacity: theme === "dark" ? 1 : 0,
          transitionProperty: "opacity",
          transitionDuration: "150ms",
          transitionTimingFunction: "ease-in-out",
          transitionDelay: theme === "dark" ? "150ms" : "0ms",
          pointerEvents: theme === "dark" ? "auto" : "none",
        }}
      >
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>

      {/* Moon icon for light mode */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute top-0 left-0 will-change-opacity"
        style={{
          opacity: theme === "light" ? 1 : 0,
          transitionProperty: "opacity",
          transitionDuration: "150ms",
          transitionTimingFunction: "ease-in-out",
          transitionDelay: theme === "light" ? "150ms" : "0ms",
          pointerEvents: theme === "light" ? "auto" : "none",
        }}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    </button>
  );
}
