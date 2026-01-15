import Header from "../components/sections/Header";
import SocialLinks from "../components/sections/SocialLinks";
import LastVisitor from "../components/sections/LastVisitor";
import ThemeToggle from "../components/ui/theme/ThemeToggle";
import Tooltip from "../components/ui/Tooltip";

export default function InvestingPage() {
  return (
    <main className="flex min-h-screen justify-center">
      <div className="text-left max-w-[500px] w-full px-4 pt-[8vh] sm:pt-[8vh] md:pt-[8vh] pb-16">
        <Header ThemeToggleComponent={ThemeToggle} currentPage="investing" />

        <section aria-labelledby="angel-investing" className="mt-6">
          <div className="text-lg">
            I angel invest in pre-seed and seed-stage people I deeply believe
            in.
          </div>
          <ul className="list-disc pl-5 space-y-1 mt-3">
            <li className="text-lg">
              <Tooltip text="enabling and benchmarking enterprise-AI adoption">
                <a
                  href="https://humandelta.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-animated"
                >
                  Human Delta
                </a>
              </Tooltip>{" "}
              (pre-seed)
            </li>
            <li className="text-lg">
              <Tooltip text="context augmentation for AI coding agents">
                <a
                  href="https://nozomio.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-animated"
                >
                  Nozomio
                </a>
              </Tooltip>{" "}
              (seed)
            </li>
            <li className="text-lg">
              <Tooltip text="social media search for behaviour prediction">
                <a
                  href="https://shofo.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-animated"
                >
                  Shofo
                </a>
              </Tooltip>{" "}
              (pre-seed)
            </li>
            <li className="text-lg">
              <Tooltip text="mathematics-focused RL environments">
                <a
                  href="https://hillclimb.ing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-animated"
                >
                  Hillclimb
                </a>
              </Tooltip>{" "}
              (pre-seed)
            </li>
          </ul>
        </section>

        <div className="mt-8">
          <SocialLinks />
          <LastVisitor />
        </div>
      </div>
    </main>
  );
}
