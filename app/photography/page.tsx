import { Metadata } from "next";
import Header from "../components/sections/Header";
import SocialLinks from "../components/sections/SocialLinks";
import LastVisitor from "../components/sections/LastVisitor";
import ThemeToggle from "../components/ui/theme/ThemeToggle";
import MosaicGrid from "../components/photography/MosaicGrid";
import { getPhotos } from "../lib/photos";

export const metadata: Metadata = {
  title: "Photography - Tom Zheng",
  description: "Photography and motion work by Tom Zheng.",
};

export default function PhotographyPage() {
  const photos = getPhotos();
  const isDevMode = process.env.NODE_ENV === "development";

  return (
    <main className="min-h-screen w-full pt-[8vh] pb-16">
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
        items={photos}
        isDevMode={isDevMode}
      />
    </main>
  );
}
