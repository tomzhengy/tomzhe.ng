import { compileMDX } from "next-mdx-remote/rsc";

function buildCarbonUrl(code: string, lang: string): string {
  const params = new URLSearchParams({
    code,
    l: lang,
    t: "one-dark",
    fm: "Fira Code",
    bg: "rgba(0,0,0,0)",
    wt: "none",
    wc: "true",
    ds: "false",
    ln: "false",
  });
  return `https://carbon.now.sh/embed?${params.toString()}`;
}

function calcHeight(code: string): number {
  const lines = code.split("\n").length;
  return Math.max(150, lines * 19 + 120);
}

export async function compileMdx(source: string) {
  const { content, frontmatter } = await compileMDX({
    source,
    options: {
      parseFrontmatter: true,
    },
    components: {
      pre: ({ children, ...props }) => {
        // extract language and code from the child <code> element
        const child = children as React.ReactElement<{
          className?: string;
          children?: React.ReactNode;
        }>;
        const className = child?.props?.className;
        const langMatch = className?.match(/language-(\w+)/);

        if (langMatch) {
          const lang = langMatch[1];
          const code = String(child?.props?.children ?? "").trim();
          const src = buildCarbonUrl(code, lang);
          const height = calcHeight(code);

          return (
            <div className="carbon-embed">
              <iframe
                src={src}
                style={{ height: `${height}px` }}
                sandbox="allow-scripts allow-same-origin"
                loading="lazy"
              />
            </div>
          );
        }

        return <pre {...props}>{children}</pre>;
      },
      code: ({ className, children }) => {
        return <code className={className}>{children}</code>;
      },
    },
  });

  return { content, frontmatter };
}
