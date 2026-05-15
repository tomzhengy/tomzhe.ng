import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import { Post, PostMeta } from "../types/blog";

const postsDirectory = path.join(process.cwd(), "content/blog");

function getPostSlugs(): string[] {
	if (!fs.existsSync(postsDirectory)) {
		return [];
	}
	const slugs: string[] = [];
	for (const file of fs.readdirSync(postsDirectory)) {
		if (file.endsWith(".mdx")) slugs.push(file.replace(/\.mdx$/, ""));
	}
	return slugs;
}

export function getPostBySlug(slug: string): Post | null {
	const fullPath = path.join(postsDirectory, `${slug}.mdx`);

	if (!fs.existsSync(fullPath)) {
		return null;
	}

	const fileContents = fs.readFileSync(fullPath, "utf8");
	const { data, content } = matter(fileContents);
	const stats = readingTime(content);

	return {
		slug,
		title: data.title || "",
		date: data.date || "",
		tags: data.tags || [],
		published: data.published ?? true,
		description: data.description || "",
		readingTime: stats.text,
		content,
	};
}

export function getAllPosts(): PostMeta[] {
	const slugs = getPostSlugs();
	const posts: PostMeta[] = [];
	for (const slug of slugs) {
		const post = getPostBySlug(slug);
		if (post !== null && post.published) {
			const { content: _content, ...meta } = post;
			void _content;
			posts.push(meta);
		}
	}
	posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	return posts;
}

export function getPostsByTag(tag: string): PostMeta[] {
	return getAllPosts().filter((post) =>
		post.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase()),
	);
}

export function getAllTags(): string[] {
	const posts = getAllPosts();
	const tags = new Set<string>();

	posts.forEach((post) => {
		post.tags.forEach((tag) => tags.add(tag.toLowerCase()));
	});

	return Array.from(tags).sort();
}
