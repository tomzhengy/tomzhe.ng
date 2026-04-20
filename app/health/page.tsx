import { Metadata } from "next";
import Header from "../components/sections/Header";
import SocialLinks from "../components/sections/SocialLinks";
import ThemeToggle from "../components/ui/theme/ThemeToggle";
import Dashboard from "./Dashboard";

export const metadata: Metadata = {
  title: "Health — Tom Zheng",
  description: "Personal health dashboard powered by WHOOP.",
};

export default function HealthPage() {
  return (
    <main className="min-h-screen w-full max-w-[1400px] mx-auto px-4 pt-[8vh] pb-16">
      <Header ThemeToggleComponent={ThemeToggle} currentPage="health" />
      <Dashboard />
      <div className="mt-16">
        <SocialLinks />
      </div>
    </main>
  );
}
