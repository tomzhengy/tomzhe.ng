import Link from "next/link";
import { PostMeta } from "@/app/types/blog";
import { formatDate } from "@/app/lib/format";

interface PostListProps {
  posts: PostMeta[];
}

export default function PostList({ posts }: PostListProps) {
  if (posts.length === 0) {
    return <p className="opacity-60">No posts yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {posts.map((post) => (
        <li key={post.slug} className="flex gap-4">
          <span className="opacity-60 whitespace-nowrap shrink-0 w-28">
            {formatDate(post.date)}
          </span>
          <Link
            href={`/blog/${post.slug}`}
            className="hover:underline opacity-85 hover:opacity-100 transition-opacity"
          >
            {post.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
