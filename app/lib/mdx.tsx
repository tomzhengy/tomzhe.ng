import { compileMDX } from "next-mdx-remote/rsc";
import { createHighlighter } from "shiki";

let highlighter: Awaited<ReturnType<typeof createHighlighter>> | null = null;

async function getHighlighter() {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ["github-dark", "github-light"],
      langs: [
        "javascript",
        "typescript",
        "python",
        "bash",
        "json",
        "css",
        "html",
        "jsx",
        "tsx",
        "markdown",
        "yaml",
        "go",
        "rust",
        "sql",
      ],
    });
  }
  return highlighter;
}

export async function compileMdx(source: string) {
  const hl = await getHighlighter();

  const { content, frontmatter } = await compileMDX({
    source,
    options: {
      parseFrontmatter: true,
    },
    components: {
      pre: ({ children, ...props }) => {
        return <pre {...props}>{children}</pre>;
      },
      code: async ({ children, className }) => {
        const lang = className?.replace("language-", "") || "text";
        const code = String(children).trim();

        // generate html for both themes
        const darkHtml = hl.codeToHtml(code, {
          lang,
          theme: "github-dark",
        });
        const lightHtml = hl.codeToHtml(code, {
          lang,
          theme: "github-light",
        });

        return (
          <span className="shiki-wrapper">
            <span
              className="shiki-dark"
              dangerouslySetInnerHTML={{ __html: darkHtml }}
            />
            <span
              className="shiki-light"
              dangerouslySetInnerHTML={{ __html: lightHtml }}
            />
          </span>
        );
      },
    },
  });

  return { content, frontmatter };
}
