import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./components/ui/theme/ThemeProvider";
import { LastVisitorProvider } from "./components/sections/LastVisitorProvider";
import { inter, crimsonText, redaction } from "./styles/fonts";

export const metadata: Metadata = {
  title: "Tom Zheng",
  description: "hey, i'm Tom.",
  metadataBase: new URL("https://tyzheng.com"),
  keywords: [
    "Tom Zheng",
    "clado",
    "San Francisco",
    "founder",
    "engineer",
    "O1 visa",
    "SDX",
    "UCSD",
    "Y Combinator",
    "Y Combinator X25",
    "YC X25",
    "clado ai",
    "clado.ai",
    "Tom",
    "Tom Zheng",
  ],
  authors: [{ name: "Tom Zheng" }],
  creator: "Tom Zheng",
  publisher: "Tom Zheng",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://tyzheng.com",
    title: "Tom Zheng",
    description:
      "Tom Zheng. I'm currently building Clado (YC X25). Clado is an agentic people-search platform. Think deep research, but for humans. We’re building the most powerful people search engine on the planet to power sales, recruiting and research for every company. I previously studied Data Science and Aerospace Engineering at UC San Diego. I'm grew up in Toronto, Canada and am now located in San Francisco learning and building the American Dream.",
    siteName: "Tom Zheng",
    images: ["/notion-face-transparent.webp"],
  },
  twitter: {
    card: "summary",
    title: "Tom Zheng",
    description:
      "Tom Zheng. I'm currently building Clado (YC X25). Clado is an agentic people-search platform. Think deep research, but for humans. We’re building the most powerful people search engine on the planet to power sales, recruiting and research for every company. I previously studied Data Science and Aerospace Engineering at UC San Diego. I'm grew up in Toronto, Canada and am now located in San Francisco learning and building the American Dream.",
    images: ["/notion-face-transparent.webp"],
  },
  icons: {
    icon: [{ url: "/notion-face-transparent.webp" }],
    apple: [{ url: "/notion-face-transparent.webp" }],
  },
  alternates: {
    canonical: "https://tyzheng.com",
  },
  other: {
    "msapplication-TileImage": "/notion-face-transparent.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${crimsonText.variable} ${redaction.variable}`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Preconnect to origin */}
        <link rel="preconnect" href="https://tyzheng.com" />
        <link rel="dns-prefetch" href="https://tyzheng.com" />

        {/* Preload critical image for LCP optimization */}
        <link
          rel="preload"
          href="/notion-face-transparent.webp"
          as="image"
          type="image/webp"
          fetchPriority="high"
        />
        {/* Inline Theme Script - Will run immediately, before page renders */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Theme detection and application script
                try {
                  // Check localStorage first
                  const savedTheme = localStorage.getItem('theme');
                  if (savedTheme === 'light' || savedTheme === 'dark') {
                    document.documentElement.classList.add(savedTheme);
                    return;
                  }
                  
                  // Then check system preference
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  document.documentElement.classList.add(prefersDark ? 'dark' : 'light');
                } catch (e) {
                  // Fallback to default theme if detection fails
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <LastVisitorProvider>{children}</LastVisitorProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
