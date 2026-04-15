import fs from 'fs';
import path from 'path';
import slugify from 'slugify';

const POSTS_DIR = 'posts';

/**
 * Derive a unique filename slug from a page title.
 * Appends a short page ID suffix when the slug would collide with an existing file.
 *
 * @param {string} title   - Human-readable page title
 * @param {string} pageId  - Notion page ID (used as collision suffix)
 * @param {Set<string>} usedSlugs - Slugs already allocated this run
 * @returns {string} Filename, e.g. "posts/my-plan.md"
 */
export function deriveFilename(title, pageId, usedSlugs) {
  const base = slugify(title || 'untitled', {
    lower: true,
    strict: true,
    trim: true,
  });

  let slug = base || 'untitled';

  if (usedSlugs.has(slug)) {
    // Append the first 8 chars of the page ID to break the collision
    slug = `${slug}-${pageId.replace(/-/g, '').slice(0, 8)}`;
  }

  usedSlugs.add(slug);
  return `${POSTS_DIR}/${slug}.md`;
}

/**
 * Write Markdown content to a file, creating parent directories as needed.
 * @param {string} filename - Target filename (relative to repo root)
 * @param {string} content  - Markdown string
 */
export function writeMarkdownFile(filename, content) {
  const dir = path.dirname(filename);
  if (dir && dir !== '.') {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filename, content, 'utf8');
}

/**
 * Delete a Markdown file (and log a warning if it doesn't exist).
 * @param {string} filename
 */
export function deleteMarkdownFile(filename) {
  if (fs.existsSync(filename)) {
    fs.rmSync(filename);
    console.log(`  Deleted: ${filename}`);
  }
}
