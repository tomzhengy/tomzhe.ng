export interface PostMeta {
  title: string;
  date: string;
  tags: string[];
  published: boolean;
  description: string;
  slug: string;
  readingTime: string;
}

export interface Post extends PostMeta {
  content: string;
}
