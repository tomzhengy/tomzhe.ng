import { PostMeta } from "@/app/types/blog";
import { formatDate } from "@/app/lib/format";

interface PostContentProps {
  meta: PostMeta;
  children: React.ReactNode;
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
      </header>
      <div className="prose">{children}</div>
    </article>
  );
}
