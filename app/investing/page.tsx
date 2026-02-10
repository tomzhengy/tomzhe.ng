import Header from "../components/sections/Header";
import SocialLinks from "../components/sections/SocialLinks";
import LastVisitor from "../components/sections/LastVisitor";
import ThemeToggle from "../components/ui/theme/ThemeToggle";
import Tooltip from "../components/ui/Tooltip";

export default function InvestingPage() {
  return (
    <main className="flex min-h-screen justify-center">
      <div className="text-left max-w-[540px] w-full px-4 pt-[8vh] pb-16">
        <Header ThemeToggleComponent={ThemeToggle} currentPage="investing" />

        <section aria-labelledby="angel-investing" className="mt-6">
          <div className="text-lg">
            I angel invest in pre-seed and seed-stage founders I deeply believe
            in. The idea is mutable, the person is constant.
          </div>
          <ul className="list-disc pl-5 space-y-1 mt-3">
            <li className="text-lg">
              <Tooltip text="enabling and benchmarking enterprise-AI adoption">
                <a
                  href="https://humandelta.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="body-link"
                >
                  Human Delta
                </a>
              </Tooltip>{" "}
              (2025)
            </li>
            <li className="text-lg">
              <Tooltip text="context augmentation for AI coding agents">
                <a
                  href="https://nozomio.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="body-link"
                >
                  Nozomio
                </a>
              </Tooltip>{" "}
              (2025)
            </li>
            <li className="text-lg">
              <Tooltip text="queryable video training data for AI labs">
                <a
                  href="https://shofo.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="body-link"
                >
                  Shofo
                </a>
              </Tooltip>{" "}
              (2025)
            </li>
            <li className="text-lg">
              <Tooltip text="mathematics-focused RL environments">
                <a
                  href="https://hillclimb.ing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="body-link"
                >
                  Hillclimb
                </a>
              </Tooltip>{" "}
              (2025)
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
