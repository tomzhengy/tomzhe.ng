"use client";

import Link from "next/link";
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
            url: "https://tomzhe.ng",
            jobTitle: "Founder",
            worksFor: {
              "@type": "Organization",
              name: "Freesolo",
              url: "https://freesolo.co",
            },
            knowsAbout: [
              "Programming",
              "Entrepreneurship",
              "Community Building",
              "Y Combinator",
              "O1 Visa",
              "SDX",
              "UCSD",
              "San Francisco",
              "Freesolo",
              "Clado",
            ],
            sameAs: [
              "https://www.sdx.community/chapters/ucsd",
              "https://freesolo.co",
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
        <div className="text-left max-w-[540px] w-full px-4 pt-[8vh] pb-16">
          {/* Header */}
          <Header ThemeToggleComponent={ThemeToggle} currentPage="home" />

          <section aria-labelledby="introduction" className="space-y-8">
            <p className="text-lg">
              I spend my time building{" "}
              <a
                href="https://freesolo.co"
                target="_blank"
                rel="noopener noreferrer"
                className="body-link"
              >
                Freesolo
              </a>
              , where we train, eval, and deploy product native models for
              enterprise. Before this, I cofounded{" "}
              <a
                href="https://clado.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="body-link"
              >
                Clado
              </a>{" "}
              and built frontier people search.
            </p>
            <p className="text-lg">
              I grew up in Toronto 🇨🇦 and spent a semester building{" "}
              <a
                href="https://sdxucsd.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="body-link"
              >
                SDx
              </a>{" "}
              before joining{" "}
              <a
                href="https://www.ycombinator.com/companies/clado"
                target="_blank"
                rel="noopener noreferrer"
                className="body-link"
              >
                YC X25
              </a>
              .
            </p>
            <p className="text-lg">
              I try to seek perspectives through{" "}
              <Link href="/photography" className="body-link">
                photography
              </Link>
              . It brings me ginosko with our world.
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
