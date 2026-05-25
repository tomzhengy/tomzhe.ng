import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "../../components/sections/Header";
import SocialLinks from "../../components/sections/SocialLinks";
import ThemeToggle from "../../components/ui/theme/ThemeToggle";
import BiomarkersDashboard from "./BiomarkersDashboard";

export const metadata: Metadata = {
	title: "Biomarkers — Tom Zheng",
	description: "Private lab biomarker history.",
	robots: { index: false, follow: false },
};

// BiomarkersDashboard uses useSearchParams; static export requires a
// Suspense boundary around that to satisfy the prerender bail-out.
export default function BiomarkersPage() {
	return (
		<main className="min-h-screen w-full max-w-[1400px] mx-auto px-4 pt-[8vh] pb-16">
			<Header ThemeToggleComponent={ThemeToggle} currentPage="health" />
			<Suspense fallback={null}>
				<BiomarkersDashboard />
			</Suspense>
			<div className="mt-16">
				<SocialLinks />
			</div>
		</main>
	);
}
