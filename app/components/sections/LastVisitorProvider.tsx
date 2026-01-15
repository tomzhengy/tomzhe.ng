"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
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
}

const LastVisitorContext = createContext<LastVisitorContextType | undefined>(
  undefined,
);

export function LastVisitorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lastVisitor, setLastVisitor] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayedLocation, setDisplayedLocation] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const hasFetched = useRef(false);
  const hasStartedTyping = useRef(false);

  useEffect(() => {
    // only fetch once per session
    if (hasFetched.current) return;
    hasFetched.current = true;

    // skip if Supabase is not configured
    if (!supabase) {
      console.log("Supabase not configured - skipping visitor tracking");
      setLoading(false);
      return;
    }

    const getLocationAndTrack = async () => {
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

    const fetchVisitorByIndex = async (index: number) => {
      try {
        const { data, error } = await supabase
          .from("visitors")
          .select("city, country, visited_at")
          .order("visited_at", { ascending: false })
          .range(index, index)
          .single();

        if (error && error.code !== "PGRST116") {
          console.log("Could not fetch visitor");
        } else if (data) {
          setLastVisitor(data);
        }
      } catch {
        // silently handle
      }
    };

    const fetchInitialVisitor = async () => {
      await fetchVisitorByIndex(1);
      setLoading(false);
    };

    getLocationAndTrack().then(() => {
      setTimeout(() => {
        fetchInitialVisitor();
      }, 1000);
    });
  }, []);

  // Typewriter effect - runs in provider so it only happens once
  useEffect(() => {
    if (hasStartedTyping.current) return;
    if (!lastVisitor || !lastVisitor.city || !lastVisitor.country) return;

    hasStartedTyping.current = true;
    const newLocation = `${lastVisitor.city}, ${lastVisitor.country}`;

    setIsTyping(true);

    let typeIndex = 0;
    const typeInterval = setInterval(() => {
      if (typeIndex < newLocation.length) {
        setDisplayedLocation(newLocation.substring(0, typeIndex + 1));
        typeIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
      }
    }, 40);

    return () => {
      clearInterval(typeInterval);
    };
  }, [lastVisitor]);

  return (
    <LastVisitorContext.Provider
      value={{
        lastVisitor,
        loading,
        displayedLocation,
        isTyping,
      }}
    >
      {children}
    </LastVisitorContext.Provider>
  );
}

export function useLastVisitor() {
  const context = useContext(LastVisitorContext);
  if (context === undefined) {
    throw new Error("useLastVisitor must be used within a LastVisitorProvider");
  }
  return context;
}
