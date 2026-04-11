import Header from "../components/sections/Header";
import SocialLinks from "../components/sections/SocialLinks";
import LastVisitor from "../components/sections/LastVisitor";
import ThemeToggle from "../components/ui/theme/ThemeToggle";

export default function PhotographyPage() {
  return (
    <main className="flex min-h-screen justify-center">
      <div className="text-left max-w-[540px] w-full px-4 pt-[8vh] pb-16">
        <Header ThemeToggleComponent={ThemeToggle} currentPage="photography" />

        <section aria-labelledby="photography" className="mt-6">
          <p className="text-lg">Coming soon.</p>
        </section>

        <div className="mt-8">
          <SocialLinks />
          <LastVisitor />
        </div>
      </div>
    </main>
  );
}
