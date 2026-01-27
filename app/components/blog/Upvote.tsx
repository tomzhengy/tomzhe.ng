"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/app/lib/supabase-client";
import { useLastVisitor } from "@/app/components/sections/LastVisitorProvider";

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
  const hashRef = useRef<string | null>(null);
  const { visitorIp, loading: visitorLoading } = useLastVisitor();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;

    // always use localStorage for consistency across page loads
    // store IP when available, or generate a random ID
    let identifier = localStorage.getItem("visitor_id");

    if (!identifier) {
      if (visitorIp) {
        // first time with IP available - store it
        identifier = visitorIp;
        localStorage.setItem("visitor_id", identifier);
      } else if (!visitorLoading) {
        // no IP and done loading - generate random ID
        identifier =
          Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem("visitor_id", identifier);
      }
    }

    if (identifier) {
      hasInitialized.current = true;
      loadUpvoteData(identifier);
    }
  }, [visitorIp, visitorLoading, slug]);

  const loadUpvoteData = async (identifier: string) => {
    if (!supabase) return;

    try {
      // create hash from identifier
      const year = new Date().getFullYear();
      hashRef.current = hashString(`${identifier}-${year}-${slug}`);

      // get count and check if user voted in parallel
      const [countResult, voteCheck] = await Promise.all([
        supabase
          .from("upvotes")
          .select("id", { count: "exact", head: true })
          .eq("slug", slug),
        supabase
          .from("upvotes")
          .select("id")
          .eq("slug", slug)
          .eq("hash_id", hashRef.current)
          .maybeSingle(),
      ]);

      setCount(countResult.count || 0);
      setHasUpvoted(!!voteCheck.data);
    } catch (error) {
      console.log("Error loading upvote data:", error);
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

  return (
    <div className="mt-2">
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
