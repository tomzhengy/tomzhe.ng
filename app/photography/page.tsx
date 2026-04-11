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
      <div className="text-left max-w-[1080px] w-full px-4 pt-[8vh] pb-16 animate-[expand-width_0.5s_ease]">
        <Header ThemeToggleComponent={ThemeToggle} currentPage="photography" />

        <section
          aria-labelledby="photography"
          className="mt-6 overflow-hidden animate-[reveal-content_0.4s_ease_0.5s_backwards]"
        >
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
