"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/app/lib/supabase-client";

interface UpvoteProps {
  slug: string;
}

// simple hash function for IP + year
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export default function Upvote({ slug }: UpvoteProps) {
  const [count, setCount] = useState(0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hashRef = useRef<string | null>(null);

  useEffect(() => {
    loadUpvoteData();
  }, [slug]);

  const loadUpvoteData = async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      // get user's IP and create a yearly hash
      const ipResponse = await fetch("https://ipapi.co/json/");
      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        const year = new Date().getFullYear();
        hashRef.current = hashString(`${ipData.ip}-${year}-${slug}`);
      }

      // get count and check if user voted in parallel
      const [countResult, voteCheck] = await Promise.all([
        supabase
          .from("upvotes")
          .select("id", { count: "exact", head: true })
          .eq("slug", slug),
        hashRef.current
          ? supabase
              .from("upvotes")
              .select("id")
              .eq("slug", slug)
              .eq("hash_id", hashRef.current)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setCount(countResult.count || 0);
      setHasUpvoted(!!voteCheck.data);
    } catch (error) {
      console.log("Error loading upvote data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUpvote = async () => {
    if (!supabase || !hashRef.current) return;

    if (hasUpvoted) {
      // remove upvote - optimistic update
      setCount((prev) => Math.max(0, prev - 1));
      setHasUpvoted(false);

      const { error } = await supabase
        .from("upvotes")
        .delete()
        .eq("slug", slug)
        .eq("hash_id", hashRef.current);

      if (error) {
        // revert on error
        setCount((prev) => prev + 1);
        setHasUpvoted(true);
      }
    } else {
      // add upvote - optimistic update
      setCount((prev) => prev + 1);
      setHasUpvoted(true);

      const { error } = await supabase
        .from("upvotes")
        .insert({ slug, hash_id: hashRef.current });

      if (error) {
        // revert on error (likely duplicate)
        setCount((prev) => prev - 1);
        setHasUpvoted(false);
      }
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="mt-8">
      <button
        onClick={handleToggleUpvote}
        className="upvote-button"
        style={{
          padding: 0,
          margin: 0,
          border: 0,
          backgroundColor: "inherit",
          color: hasUpvoted ? "salmon" : "inherit",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "pointer",
        }}
        aria-label={hasUpvoted ? "Remove upvote" : "Upvote this post"}
        title={hasUpvoted ? "Remove upvote" : "Upvote this post"}
      >
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="24"
          height="24"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="17 11 12 6 7 11"></polyline>
          <polyline points="17 18 12 13 7 18"></polyline>
        </svg>
        <small
          style={{
            marginTop: "-6px",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "11px",
          }}
        >
          {count}
        </small>
      </button>
    </div>
  );
}
