"use client";

import Script from "next/script";

import SocialLinks from "./components/sections/SocialLinks";
import Header from "./components/sections/Header";
import LastVisitor from "./components/sections/LastVisitor";

import ThemeToggle from "./components/ui/theme/ThemeToggle";

export default function Home() {
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

      <main className="flex min-h-screen justify-center">
        <div className="text-left max-w-[500px] w-full px-4 pt-[8vh] pb-16">
          {/* Header */}
          <Header ThemeToggleComponent={ThemeToggle} currentPage="home" />

          <section aria-labelledby="introduction" className="space-y-8">
            <p className="text-lg">
              Hey, my name is Tom. I currently spend my time building <a
                href="https://clado.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Clado
              </a>
              , where we train, eval, and deploy task-specific small language
              models.
            </p>
            <p className="text-lg">
              I grew up in 🇨🇦 and spent a semester building <a
                href="https://sdxucsd.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                SDx
              </a> @ UCSD before joining YC X25.
            </p>
          </section>

          {/* Bottom section */}
          <div className="mt-8">
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
