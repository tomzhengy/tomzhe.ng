import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "./components/ui/theme/ThemeProvider";
import { LastVisitorProvider } from "./components/sections/LastVisitorProvider";
import NoiseTexture from "./components/ui/NoiseTexture";
import {
	inter,
	redaction,
	instrumentSerif,
	jetbrainsMono,
} from "./styles/fonts";

export const metadata: Metadata = {
	title: "Tom Zheng",
	description:
		"Tom Zheng is a founder and engineer based in San Francisco. Currently building Freesolo. Previously cofounded Clado (YC X25), a people search platform. UCSD alum.",
	metadataBase: new URL("https://tomzhe.ng"),
	keywords: [
		"Tom Zheng",
		"Freesolo",
		"Clado",
		"San Francisco",
		"founder",
		"engineer",
		"Y Combinator",
		"YC X25",
		"SDX",
		"UCSD",
	],
	authors: [{ name: "Tom Zheng" }],
	creator: "Tom Zheng",
	publisher: "Tom Zheng",
	robots: "index, follow",
	openGraph: {
		type: "website",
		locale: "en_US",
		url: "https://tomzhe.ng",
		title: "Tom Zheng",
		description:
			"Tom Zheng is a founder and engineer based in San Francisco. Currently building Freesolo. Previously cofounded Clado (YC X25), a people search platform. UCSD alum, grew up in Toronto.",
		siteName: "Tom Zheng",
		images: ["/notion-face-transparent.webp"],
	},
	twitter: {
		card: "summary",
		title: "Tom Zheng",
		description:
			"Tom Zheng is a founder and engineer based in San Francisco. Currently building Freesolo. Previously cofounded Clado (YC X25), a people search platform. UCSD alum, grew up in Toronto.",
		images: ["/notion-face-transparent.webp"],
	},
	icons: {
		icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
		apple: [{ url: "/favicon.svg" }],
	},
	alternates: {
		canonical: "https://tomzhe.ng",
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
			className={`${inter.variable} ${redaction.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
		>
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				{/* Preconnect to origin */}
				<link rel="preconnect" href="https://tomzhe.ng" />
				<link rel="dns-prefetch" href="https://tomzhe.ng" />

				{/* Preload critical image for LCP optimization */}
				<link
					rel="preload"
					href="/notion-face-transparent.webp"
					as="image"
					type="image/webp"
					fetchPriority="high"
				/>
				{/* Inline Theme Script - Will run immediately, before page renders */}
				<Script
					id="theme-init"
					strategy="beforeInteractive"
				>{`(function(){try{var s=localStorage.getItem('theme');if(s==='light'||s==='dark'){document.documentElement.classList.add(s);return;}var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.add(d?'dark':'light');}catch(e){document.documentElement.classList.add('dark');}})();`}</Script>
			</head>
			<body>
				<NoiseTexture />
				<ThemeProvider>
					<LastVisitorProvider>{children}</LastVisitorProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
