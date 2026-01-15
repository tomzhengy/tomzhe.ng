import Header from "../components/sections/Header";
import ThemeToggle from "../components/ui/theme/ThemeToggle";

export default function InvestingPage() {
  return (
    <main className="flex min-h-screen justify-center">
      <div className="text-left max-w-[500px] w-full px-4 pt-[8vh] sm:pt-[8vh] md:pt-[8vh] pb-16">
        <Header ThemeToggleComponent={ThemeToggle} currentPage="investing" />
      </div>
    </main>
  );
}
