"use client";

import Tooltip from "../ui/Tooltip";

export default function ContentSections() {
  return (
    <>
      <section aria-labelledby="angel-investing" className="mt-6 mb-12">
        <div className="text-lg">I also angel invest.</div>
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
    </>
  );
}
