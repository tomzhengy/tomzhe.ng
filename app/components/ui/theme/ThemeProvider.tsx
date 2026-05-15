"use client";

import React, {
	createContext,
	use,
	useEffect,
	useReducer,
	useRef,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
	theme: Theme;
	toggleTheme: () => void;
	mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to avoid accessing localStorage during SSR
function getThemeFromStorage(): Theme | null {
	if (typeof window === "undefined") return null;
	try {
		return localStorage.getItem("theme") as Theme | null;
	} catch {
		return null;
	}
}

// Helper to detect system preference
function getSystemTheme(): Theme {
	if (typeof window === "undefined") return "dark";
	try {
		return window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
	} catch {
		return "dark";
	}
}

interface State {
	theme: Theme;
	mounted: boolean;
}

type Action =
	| { type: "mount"; theme: Theme }
	| { type: "set-theme"; theme: Theme };

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "mount":
			return { theme: action.theme, mounted: true };
		case "set-theme":
			return { ...state, theme: action.theme };
	}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [state, dispatch] = useReducer(reducer, {
		theme: "dark",
		mounted: false,
	});
	// manual-set lives in a ref because reads happen only inside handlers, not render
	const isManuallySetRef = useRef(false);

	// detect system theme preference and wire up listener — once on mount
	useEffect(() => {
		const savedTheme = getThemeFromStorage();
		if (savedTheme) {
			isManuallySetRef.current = true;
			dispatch({ type: "mount", theme: savedTheme });
		} else {
			isManuallySetRef.current = false;
			dispatch({ type: "mount", theme: getSystemTheme() });
		}

		try {
			const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
			const handleChange = (e: MediaQueryListEvent) => {
				if (!isManuallySetRef.current) {
					dispatch({ type: "set-theme", theme: e.matches ? "dark" : "light" });
				}
			};
			mediaQuery.addEventListener("change", handleChange);
			return () => {
				mediaQuery.removeEventListener("change", handleChange);
			};
		} catch (error) {
			console.error("Error setting up theme listeners:", error);
		}
	}, []);

	// apply theme to document element
	useEffect(() => {
		if (!state.mounted) return;
		try {
			const root = document.documentElement;
			root.classList.remove("light", "dark");
			root.classList.add(state.theme);
			if (isManuallySetRef.current) {
				localStorage.setItem("theme", state.theme);
			}
		} catch (error) {
			console.error("Error updating theme:", error);
		}
	}, [state.theme, state.mounted]);

	const toggleTheme = () => {
		isManuallySetRef.current = true;
		dispatch({
			type: "set-theme",
			theme: state.theme === "dark" ? "light" : "dark",
		});
	};

	const contextValue = {
		theme: state.theme,
		toggleTheme,
		mounted: state.mounted,
	};

	return (
		<ThemeContext.Provider value={contextValue}>
			{children}
		</ThemeContext.Provider>
	);
}

// custom hook to use theme context
export function useTheme() {
	const context = use(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
