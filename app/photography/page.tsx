import { Metadata } from "next";
import Header from "../components/sections/Header";
import SocialLinks from "../components/sections/SocialLinks";
import LastVisitor from "../components/sections/LastVisitor";
import ThemeToggle from "../components/ui/theme/ThemeToggle";
import MosaicGrid from "../components/photography/MosaicGrid";

export const metadata: Metadata = {
  title: "Photography - Tom Zheng",
  description: "Photography and motion work by Tom Zheng.",
};

export default function PhotographyPage() {
  return (
    <main className="min-h-screen">
      <div className="max-w-[540px] mx-auto px-4 pt-[8vh]">
        <Header ThemeToggleComponent={ThemeToggle} currentPage="photography" />
      </div>

      <section aria-labelledby="photography" className="mt-6 px-4">
        <MosaicGrid />
      </section>

      <div className="max-w-[540px] mx-auto px-4 mt-8 pb-16">
        <SocialLinks />
        <LastVisitor />
      </div>
    </main>
  );
}
