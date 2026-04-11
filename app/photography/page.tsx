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
    <main className="min-h-screen w-full px-4 pt-[8vh] pb-16">
      <MosaicGrid
        header={
          <Header
            ThemeToggleComponent={ThemeToggle}
            currentPage="photography"
          />
        }
        footer={
          <div className="mt-8">
            <SocialLinks />
            <LastVisitor />
          </div>
        }
      />
    </main>
  );
}
