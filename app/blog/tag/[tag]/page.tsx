import { Metadata } from "next";
import Link from "next/link";
import Header from "../../../components/sections/Header";
import SocialLinks from "../../../components/sections/SocialLinks";
import LastVisitor from "../../../components/sections/LastVisitor";
import ThemeToggle from "../../../components/ui/theme/ThemeToggle";
import PostList from "../../../components/blog/PostList";
import { getAllTags, getPostsByTag } from "../../../lib/blog";

interface Props {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  const tags = getAllTags();
  return tags.map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  return {
    title: `Posts tagged "${tag}" - Tom Zheng`,
    description: `All blog posts tagged with ${tag}`,
  };
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const posts = getPostsByTag(tag);

  return (
    <main className="flex min-h-screen justify-center">
      <div className="text-left max-w-[500px] w-full px-4 pt-[8vh] pb-16">
        <Header ThemeToggleComponent={ThemeToggle} currentPage="blog" />

        <section className="mt-6">
          <h1 className="text-xl mb-4">
            Posts tagged <span className="opacity-60">#{tag}</span>
          </h1>
          <PostList posts={posts} />
        </section>

        <div className="mt-6">
          <Link
            href="/blog"
            className="opacity-60 hover:opacity-100 hover:underline transition-opacity"
          >
            &larr; All posts
          </Link>
        </div>

        <div className="mt-8">
          <SocialLinks />
          <LastVisitor />
        </div>
      </div>
    </main>
  );
}
