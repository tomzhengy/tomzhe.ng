"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/app/lib/supabase-client";

interface Visitor {
  city: string | null;
  country: string | null;
  visited_at: string;
}

export default function LastVisitor() {
  const [lastVisitor, setLastVisitor] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayedLocation, setDisplayedLocation] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  const currentLocationRef = useRef<string>("");

  useEffect(() => {
    // Skip if Supabase is not configured
    if (!supabase) {
      console.log('Supabase not configured - skipping visitor tracking');
      setLoading(false);
      return;
    }

    // Get location from IP using client-side API
    const getLocationAndTrack = async () => {
      try {
        // Get location using ipapi.co (works from browser too)
        const locationResponse = await fetch('https://ipapi.co/json/');
        
        if (!locationResponse.ok) {
          console.log('Location API rate limited or unavailable');
          return;
        }
        
        const locationData = await locationResponse.json();
        
        // Check if we got an error response from ipapi
        if (locationData.error || locationData.reason === 'RateLimited') {
          console.log('Location API rate limited:', locationData.message || 'Too many requests');
          return;
        }
        
        // Track this visit
        const { error: trackError } = await supabase
          .from('visitors')
          .insert({
            city: locationData.city || 'Unknown',
            country: locationData.country_name || 'Unknown',
            ip: locationData.ip || null,
          });
          
        if (trackError) {
          // Only log if it's not a typical development error
          if (trackError.message && !trackError.message.includes('Failed to fetch')) {
            console.log('Visitor tracking disabled:', trackError.message);
          }
        }
      } catch (error) {
        // Silently handle errors in development
        if (error instanceof Error && !error.message.includes('Failed to fetch')) {
          console.log('Visitor tracking unavailable');
        }
      }
    };

    // Fetch visitor by row index (0 = first row, 1 = second row)
    const fetchVisitorByIndex = async (index: number) => {
      try {
        const { data, error } = await supabase
          .from('visitors')
          .select('city, country, visited_at')
          .order('visited_at', { ascending: false })
          .range(index, index)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          // Only log if it's not a "no rows" error
          console.log('Could not fetch visitor');
        } else if (data) {
          setLastVisitor(data);
        }
      } catch {
        // Silently handle in development
      }
    };

    // Initial fetch - get second row
    const fetchInitialVisitor = async () => {
      await fetchVisitorByIndex(1);
      setLoading(false);
    };

    // Track visit and then fetch initial visitor
    getLocationAndTrack().then(() => {
      // Wait a bit to ensure the database has updated
      setTimeout(() => {
        fetchInitialVisitor();
      }, 1000);
    });


  }, []); // Empty dependency array ensures this only runs once on mount

  // Typewriter effect when location data is loaded
  useEffect(() => {
    if (lastVisitor && lastVisitor.city && lastVisitor.country) {
      const newLocation = `${lastVisitor.city}, ${lastVisitor.country}`;
      
      // Only run typewriter if this is a new location
      if (currentLocationRef.current === newLocation) {
        return;
      }
      
      setIsTyping(true);
      
      // If there's existing text, do reverse typewriter first
      if (displayedLocation.length > 0) {
        let currentLength = displayedLocation.length;
        
        const eraseInterval = setInterval(() => {
          if (currentLength > 0) {
            setDisplayedLocation(prev => prev.substring(0, currentLength - 1));
            currentLength--;
          } else {
            clearInterval(eraseInterval);
            
            // Now type the new location
            let typeIndex = 0;
            const typeInterval = setInterval(() => {
              if (typeIndex < newLocation.length) {
                setDisplayedLocation(newLocation.substring(0, typeIndex + 1));
                typeIndex++;
              } else {
                clearInterval(typeInterval);
                setIsTyping(false);
                currentLocationRef.current = newLocation;
              }
            }, 40); // Normal typing speed
          }
        }, 20); // 50% faster for erasing (20ms instead of 40ms)
        
        return () => {
          clearInterval(eraseInterval);
          setIsTyping(false);
        };
      } else {
        // No existing text, just type normally
        let typeIndex = 0;
        const typeInterval = setInterval(() => {
          if (typeIndex < newLocation.length) {
            setDisplayedLocation(newLocation.substring(0, typeIndex + 1));
            typeIndex++;
          } else {
            clearInterval(typeInterval);
            setIsTyping(false);
            currentLocationRef.current = newLocation;
          }
        }, 40); // Normal typing speed
        
        return () => {
          clearInterval(typeInterval);
          setIsTyping(false);
        };
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastVisitor]);

  // Always show "last visit from" text
  if (!supabase) {
    return null;
  }

  // Don't render if we're still loading or if there's no visitor data
  if (loading) {
    return (
      <div className="text-sm text-foreground/50 mb-4">
        last visit from <span className="inline-block animate-[blink_0.5s_ease_infinite]">_</span>
      </div>
    );
  }

  if (!lastVisitor || !lastVisitor.city || !lastVisitor.country) {
    return null;
  }

  return (
    <div className="text-sm text-foreground/50 mb-4">
      last visit from {displayedLocation}
      <span className={`inline-block ${isTyping ? '' : 'animate-[blink_0.5s_ease_infinite]'}`}>_</span>
    </div>
  );
} 