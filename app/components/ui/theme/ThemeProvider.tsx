"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
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
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "dark";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to system theme when possible
  const [theme, setTheme] = useState<Theme>("dark");
  // Add state to track if user has manually set theme
  const [isManuallySet, setIsManuallySet] = useState<boolean>(false);
  // Add state to track if we've mounted yet to avoid hydration issues
  const [mounted, setMounted] = useState(false);

  // Effect to detect system theme preference - only runs client-side after hydration
  useEffect(() => {
    setMounted(true);
    
    // Initialize theme
    const savedTheme = getThemeFromStorage();
    
    if (savedTheme) {
      setTheme(savedTheme);
      setIsManuallySet(true);
    } else {
      // Use system preference as default
      setTheme(getSystemTheme());
      setIsManuallySet(false);
    }
    
    // Add listener for system preference changes
    try {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        // Only follow system if user hasn't manually set a preference
        if (!isManuallySet) {
          setTheme(e.matches ? "dark" : "light");
        }
      };
      
      // Add event listener (use the right method based on browser support)
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handleChange);
      } else {
        // For older browsers
        mediaQuery.addListener(handleChange);
      }
      
      // Cleanup
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener("change", handleChange);
        } else {
          // For older browsers
          mediaQuery.removeListener(handleChange);
        }
      };
    } catch (error) {
      console.error("Error setting up theme listeners:", error);
    }
  }, [isManuallySet]);

  // Effect to apply theme to document element
  useEffect(() => {
    if (!mounted) return;
    
    try {
      // Update classes for dark/light mode
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      
      // Only save to localStorage if manually set by user
      if (isManuallySet) {
        localStorage.setItem("theme", theme);
      }
    } catch (error) {
      console.error("Error updating theme:", error);
    }
  }, [theme, mounted, isManuallySet]);

  // Function to toggle theme
  const toggleTheme = () => {
    setIsManuallySet(true); // Mark as manually set when user toggles
    setTheme(prevTheme => (prevTheme === "dark" ? "light" : "dark"));
  };

  const contextValue = {
    theme,
    toggleTheme
  };

  // Using suppressHydrationWarning to prevent errors when server/client render differently
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
} 