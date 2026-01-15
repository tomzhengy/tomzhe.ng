"use client";

import { useState, useEffect } from "react";
import Header from "../components/sections/Header";
import ThemeToggle from "../components/ui/theme/ThemeToggle";

function getPDTTime() {
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Los_Angeles",
  };
  return new Date().toLocaleTimeString("en-US", options);
}

export default function InvestingPage() {
  const [currentTime, setCurrentTime] = useState<string>(() => {
    if (typeof window === "undefined") return "00:00:00";
    return getPDTTime();
  });

  useEffect(() => {
    const updatePDTTime = () => {
      setCurrentTime(getPDTTime());
    };

    updatePDTTime();
    const interval = setInterval(updatePDTTime, 1);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex min-h-screen justify-center">
      <div className="text-left max-w-[500px] w-full px-4 pt-[8vh] sm:pt-[8vh] md:pt-[8vh] pb-16">
        <Header
          currentTime={currentTime}
          ThemeToggleComponent={ThemeToggle}
          currentPage="investing"
        />
      </div>
    </main>
  );
}
