"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";

import ContentSections from "./components/sections/ContentSections";
import SocialLinks from "./components/sections/SocialLinks";
import Header from "./components/sections/Header";
import LastVisitor from "./components/sections/LastVisitor";

import ThemeToggle from "./components/ui/theme/ThemeToggle";
import Tooltip from "./components/ui/Tooltip";

// Helper function to get PDT time
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

export default function Home() {
  // Initialize with a placeholder that matches the time format
  const [currentTime, setCurrentTime] = useState<string>(() => {
    // Use a placeholder on server, actual time will be set on client
    if (typeof window === "undefined") return "00:00:00";
    return getPDTTime();
  });
  const mainRef = useRef<HTMLDivElement>(null);
  const [emailCopied, setEmailCopied] = useState(false);

  // Email copy handler
  const handleEmailClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText("tomzheng1012@gmail.com");
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy email:", err);
    }
  };

  // Effect to update the PDT time every second
  useEffect(() => {
    const updatePDTTime = () => {
      setCurrentTime(getPDTTime());
    };

    // Initial update
    updatePDTTime();

    // Set interval to update every second
    const interval = setInterval(updatePDTTime, 1);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Script
        id="schema-person"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: "Tom Zheng",
            url: "https://tyzheng.com",
            jobTitle: "Founder",
            worksFor: {
              "@type": "Organization",
              name: "clado",
              url: "https://clado.ai",
            },
            knowsAbout: [
              "Programming",
              "Entrepreneurship",
              "Community Building",
              "Y Combinator",
              "`O1 Visa`",
              "SDX",
              "UCSD",
              "San Francisco",
              "Founder",
              "Engineer",
              "Clado",
              "Clado AI",
              "clado.ai",
              "Tom Zheng",
              "Tom",
              "Founder",
              "Engineer",
            ],
            sameAs: [
              "https://www.sdx.community/chapters/ucsd",
              "https://clado.ai",
              "https://tyzheng.com",
              "https://tomzhe.ng",
              "https://tomzheng.dev",
              "https://linkedin.com/in/tomzheng",
            ],
          }),
        }}
      />

      <main ref={mainRef} className="flex min-h-screen justify-center">
        <div className="text-left max-w-[500px] w-full px-4 pt-[8vh] sm:pt-[8vh] md:pt-[8vh] pb-16">
          {/* Header with theme toggle and PDT time */}
          <Header
            currentTime={currentTime}
            ThemeToggleComponent={ThemeToggle}
          />

          <section aria-labelledby="introduction">
            <div className="text-lg">
              Hey, my name is Tom. I currently spend my time building{" "}
              <a
                href="https://clado.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="underline-animated"
              >
                Clado
              </a>
              .
              <br />
              <br />I grew up in 🇨🇦 and spent a semester building{" "}
              <a
                href="https://sdxucsd.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline-animated"
              >
                SDx
              </a>{" "}
              @ UCSD before joining YC X25.
              <br />
              <br />
              Contact me:{" "}
              <Tooltip text={emailCopied ? "copied!" : "copy"}>
                <a
                  href="#"
                  onClick={handleEmailClick}
                  className="underline-animated cursor-pointer"
                >
                  email
                </a>
              </Tooltip>{" "}
              or{" "}
              <a
                href="https://x.com/tomzhengy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline-animated"
              >
                x/twitter
              </a>
              .
            </div>
            <hr className="mt-4 border-t border-gray-400 opacity-55" />
          </section>

          {/* Content sections */}
          <ContentSections />

          {/* Bottom section */}
          <div className="mt-6">
            {/* Social links */}
            <SocialLinks />

            {/* Last visitor tracker */}
            <LastVisitor />
          </div>
        </div>
      </main>
    </>
  );
}
