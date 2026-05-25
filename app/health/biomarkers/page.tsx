import type { Metadata } from "next";
import Header from "../../components/sections/Header";
import SocialLinks from "../../components/sections/SocialLinks";
import ThemeToggle from "../../components/ui/theme/ThemeToggle";
import BiomarkersDashboard from "./BiomarkersDashboard";

export const metadata: Metadata = {
	title: "Biomarkers — Tom Zheng",
	description: "Private lab biomarker history.",
	robots: { index: false, follow: false },
};

export default function BiomarkersPage() {
	return (
		<main className="min-h-screen w-full max-w-[1400px] mx-auto px-4 pt-[8vh] pb-16">
			<Header ThemeToggleComponent={ThemeToggle} currentPage="health" />
			<BiomarkersDashboard />
			<div className="mt-16">
				<SocialLinks />
			</div>
		</main>
	);
}
