import Link from "next/link";
import { PostMeta } from "@/app/types/blog";

interface PostContentProps {
  meta: PostMeta;
  children: React.ReactNode;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PostContent({ meta, children }: PostContentProps) {
  return (
    <article>
      <header className="mb-8">
        <h1 className="text-2xl mb-2">{meta.title}</h1>
        <div className="flex flex-wrap gap-4 text-sm opacity-60">
          <span>{formatDate(meta.date)}</span>
          <span>{meta.readingTime}</span>
        </div>
        {meta.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {meta.tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog/tag/${tag.toLowerCase()}`}
                className="text-sm opacity-60 hover:opacity-100 hover:underline transition-opacity"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </header>
      <div className="prose">{children}</div>
    </article>
  );
}
