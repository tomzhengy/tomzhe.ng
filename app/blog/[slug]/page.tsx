import { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "../../components/sections/Header";
import SocialLinks from "../../components/sections/SocialLinks";
import LastVisitor from "../../components/sections/LastVisitor";
import ThemeToggle from "../../components/ui/theme/ThemeToggle";
import PostContent from "../../components/blog/PostContent";
import Upvote from "../../components/blog/Upvote";
import { getAllPosts, getPostBySlug } from "../../lib/blog";
import { compileMdx } from "../../lib/mdx";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return { title: "Post Not Found" };
  }

  return {
    title: `${post.title} - Tom Zheng`,
    description: post.description,
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post || !post.published) {
    notFound();
  }

  const { content } = await compileMdx(post.content);

  return (
    <main className="flex min-h-screen justify-center">
      <div className="text-left max-w-[540px] w-full px-4 pt-[8vh] pb-16">
        <Header ThemeToggleComponent={ThemeToggle} currentPage="blog" />

        <section className="mt-6">
          <PostContent meta={post}>{content}</PostContent>
          <Upvote slug={slug} />
        </section>

        <div className="mt-8">
          <SocialLinks />
          <LastVisitor />
        </div>
      </div>
    </main>
  );
}
