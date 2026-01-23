import { Feed } from "feed";
import { getAllPosts } from "../lib/blog";

export const dynamic = "force-static";

export async function GET() {
  const posts = getAllPosts();
  const siteUrl = "https://tyzheng.com";

  const feed = new Feed({
    title: "Tom Zheng",
    description: "Thoughts on startups, engineering, and life.",
    id: siteUrl,
    link: siteUrl,
    language: "en",
    favicon: `${siteUrl}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}, Tom Zheng`,
    author: {
      name: "Tom Zheng",
      email: "tom@tyzheng.com",
      link: siteUrl,
    },
  });

  posts.forEach((post) => {
    feed.addItem({
      title: post.title,
      id: `${siteUrl}/blog/${post.slug}`,
      link: `${siteUrl}/blog/${post.slug}`,
      description: post.description,
      date: new Date(post.date),
    });
  });

  return new Response(feed.rss2(), {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
