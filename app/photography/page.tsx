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
    <main className="flex min-h-screen justify-center">
      <div className="text-left w-full px-4 pt-[8vh] pb-16">
        <Header ThemeToggleComponent={ThemeToggle} currentPage="photography" />

        <section aria-labelledby="photography" className="mt-6">
          <MosaicGrid />
        </section>

        <div className="mt-8">
          <SocialLinks />
          <LastVisitor />
        </div>
      </div>
    </main>
  );
}
