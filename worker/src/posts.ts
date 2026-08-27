// Cloudflare Workers can't glob-import a directory, so each post gets a
// manual import here. Adding a post = write the .md file in content/posts/,
// import it below, add one line to POSTS. Newest first.

import measuringDocsDrift from "../content/posts/measuring-docs-drift-detection.md";
import silenceIsTheFeature from "../content/posts/silence-is-the-feature.md";
import { parsePost, type Post } from "./markdown";

const RAW_POSTS: Array<{ slug: string; raw: string }> = [
  { slug: "silence-is-the-feature", raw: silenceIsTheFeature },
  { slug: "measuring-docs-drift-detection", raw: measuringDocsDrift },
];

let cached: Post[] | null = null;

export function getAllPosts(): Post[] {
  if (!cached) {
    // Comparator returns 0 on equal dates (not -1/1) so Array.sort's
    // guaranteed stability preserves RAW_POSTS' own order as the tiebreaker
    // -- otherwise two same-dated posts get an order that isn't the
    // declared "newest first" intent, it's whatever the sort's internal
    // swap happens to produce.
    cached = RAW_POSTS.map((p) => parsePost(p.slug, p.raw)).sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
  }
  return cached;
}

export function getPost(slug: string): Post | null {
  return getAllPosts().find((p) => p.slug === slug) ?? null;
}
