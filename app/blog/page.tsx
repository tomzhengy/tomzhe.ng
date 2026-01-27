import { Metadata } from "next";
import Header from "../components/sections/Header";
import SocialLinks from "../components/sections/SocialLinks";
import LastVisitor from "../components/sections/LastVisitor";
import ThemeToggle from "../components/ui/theme/ThemeToggle";
import PostList from "../components/blog/PostList";
import { getAllPosts } from "../lib/blog";

export const metadata: Metadata = {
  title: "Blog - Tom Zheng",
  description: "Thoughts on startups, engineering, and life.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="flex min-h-screen justify-center">
      <div className="text-left max-w-[500px] w-full px-4 pt-[8vh] pb-16">
        <Header ThemeToggleComponent={ThemeToggle} currentPage="blog" />

        <section className="mt-6">
          <PostList posts={posts} />
        </section>

        <div className="mt-8">
          <SocialLinks />
          <LastVisitor />
        </div>
      </div>
    </main>
  );
}
