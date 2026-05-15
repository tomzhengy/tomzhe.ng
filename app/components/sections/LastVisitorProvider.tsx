"use client";

import React, {
	createContext,
	use,
	useEffect,
	useReducer,
	useRef,
} from "react";
import { supabase } from "@/app/lib/supabase-client";

interface Visitor {
	city: string | null;
	country: string | null;
	visited_at: string;
}

interface LastVisitorContextType {
	lastVisitor: Visitor | null;
	loading: boolean;
	displayedLocation: string;
	isTyping: boolean;
	visitorIp: string | null;
}

interface State {
	lastVisitor: Visitor | null;
	loading: boolean;
	displayedLocation: string;
	isTyping: boolean;
	visitorIp: string | null;
}

type Action =
	| { type: "init-done" }
	| { type: "set-ip"; ip: string }
	| { type: "set-visitor"; visitor: Visitor }
	| { type: "start-typing" }
	| { type: "type-char"; text: string }
	| { type: "stop-typing" };

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "init-done":
			return { ...state, loading: false };
		case "set-ip":
			return { ...state, visitorIp: action.ip };
		case "set-visitor":
			return { ...state, lastVisitor: action.visitor, loading: false };
		case "start-typing":
			return { ...state, isTyping: true };
		case "type-char":
			return { ...state, displayedLocation: action.text };
		case "stop-typing":
			return { ...state, isTyping: false };
	}
}

const initialState: State = {
	lastVisitor: null,
	loading: true,
	displayedLocation: "",
	isTyping: false,
	visitorIp: null,
};

const LastVisitorContext = createContext<LastVisitorContextType | undefined>(
	undefined,
);

export function LastVisitorProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [state, dispatch] = useReducer(reducer, initialState);
	const hasFetched = useRef(false);
	const hasStartedTyping = useRef(false);

	useEffect(() => {
		// only fetch once per session
		if (hasFetched.current) return;
		hasFetched.current = true;

		// skip if Supabase is not configured
		if (!supabase) {
			console.log("Supabase not configured - skipping visitor tracking");
			dispatch({ type: "init-done" });
			return;
		}

		let cancelled = false;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		const getLocationAndTrack = async () => {
			if (!supabase) return;

			try {
				const locationResponse = await fetch("https://ipapi.co/json/");

				if (!locationResponse.ok) {
					console.log("Location API rate limited or unavailable");
					return;
				}

				const locationData = await locationResponse.json();

				if (locationData.error || locationData.reason === "RateLimited") {
					console.log(
						"Location API rate limited:",
						locationData.message || "Too many requests",
					);
					return;
				}

				if (locationData.ip && !cancelled) {
					dispatch({ type: "set-ip", ip: locationData.ip });
				}

				const { error: trackError } = await supabase.from("visitors").insert({
					city: locationData.city || "Unknown",
					country: locationData.country_name || "Unknown",
					ip: locationData.ip || null,
				});

				if (trackError) {
					if (
						trackError.message &&
						!trackError.message.includes("Failed to fetch")
					) {
						console.log("Visitor tracking disabled:", trackError.message);
					}
				}
			} catch (error) {
				if (
					error instanceof Error &&
					!error.message.includes("Failed to fetch")
				) {
					console.log("Visitor tracking unavailable");
				}
			}
		};

		const fetchInitialVisitor = async () => {
			if (!supabase || cancelled) return;
			try {
				const { data, error } = await supabase
					.from("visitors")
					.select("city, country, visited_at")
					.order("visited_at", { ascending: false })
					.range(1, 1)
					.single();

				if (cancelled) return;
				if (error && error.code !== "PGRST116") {
					console.log("Could not fetch visitor");
					dispatch({ type: "init-done" });
				} else if (data) {
					dispatch({ type: "set-visitor", visitor: data });
				} else {
					dispatch({ type: "init-done" });
				}
			} catch {
				if (!cancelled) dispatch({ type: "init-done" });
			}
		};

		getLocationAndTrack().then(() => {
			if (cancelled) return;
			timeoutId = setTimeout(() => {
				fetchInitialVisitor();
			}, 1000);
		});

		return () => {
			cancelled = true;
			if (timeoutId) clearTimeout(timeoutId);
		};
	}, []);

	// typewriter effect - runs in provider so it only happens once
	useEffect(() => {
		if (hasStartedTyping.current) return;
		if (
			!state.lastVisitor ||
			!state.lastVisitor.city ||
			!state.lastVisitor.country
		)
			return;

		hasStartedTyping.current = true;
		const newLocation = `${state.lastVisitor.city}, ${state.lastVisitor.country}`;

		dispatch({ type: "start-typing" });

		let typeIndex = 0;
		const typeInterval = setInterval(() => {
			if (typeIndex < newLocation.length) {
				dispatch({
					type: "type-char",
					text: newLocation.substring(0, typeIndex + 1),
				});
				typeIndex++;
			} else {
				clearInterval(typeInterval);
				dispatch({ type: "stop-typing" });
			}
		}, 40);

		return () => {
			clearInterval(typeInterval);
		};
	}, [state.lastVisitor]);

	return (
		<LastVisitorContext.Provider
			value={{
				lastVisitor: state.lastVisitor,
				loading: state.loading,
				displayedLocation: state.displayedLocation,
				isTyping: state.isTyping,
				visitorIp: state.visitorIp,
			}}
		>
			{children}
		</LastVisitorContext.Provider>
	);
}

export function useLastVisitor() {
	const context = use(LastVisitorContext);
	if (context === undefined) {
		throw new Error("useLastVisitor must be used within a LastVisitorProvider");
	}
	return context;
}
