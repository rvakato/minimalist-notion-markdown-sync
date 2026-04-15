import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';

const IMAGES_DIR = 'images';

/**
 * Ensure the images directory exists.
 */
function ensureImagesDir() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
}

/**
 * Derive a stable local filename from a pageId, blockId, and remote URL.
 * Uses the URL's pathname extension, falling back to '.bin'.
 * @param {string} pageId
 * @param {string} blockId
 * @param {string} remoteUrl
 * @returns {string} Relative path, e.g. "images/abc123-def456.png"
 */
function localFilename(pageId, blockId, remoteUrl) {
  let ext = '.bin';
  try {
    const pathname = new URL(remoteUrl).pathname;
    const parsed = path.extname(pathname).split('?')[0];
    if (parsed) ext = parsed;
  } catch {
    // ignore malformed URLs
  }
  return path.join(IMAGES_DIR, `${pageId}-${blockId}${ext}`);
}

/**
 * Download a single image if it hasn't been downloaded yet.
 * @param {string} remoteUrl
 * @param {string} localPath
 */
async function downloadIfMissing(remoteUrl, localPath) {
  if (fs.existsSync(localPath)) return;

  const response = await axios.get(remoteUrl, {
    responseType: 'arraybuffer',
    timeout: 30_000,
  });
  fs.writeFileSync(localPath, response.data);
}

/**
 * Walk a block tree, download all image/file assets, and return a
 * map of { remoteUrl -> localRelativePath } for URL rewriting.
 * @param {Array} blocks - Top-level blocks (with nested .children)
 * @param {string} pageId - Owning page ID (used for naming)
 * @returns {Promise<Map<string, string>>}
 */
export async function downloadPageImages(blocks, pageId) {
  ensureImagesDir();
  const urlMap = new Map();

  async function walk(block) {
    if (block.type === 'image') {
      const remoteUrl =
        block.image.type === 'external'
          ? block.image.external.url
          : block.image.file.url;

      const localPath = localFilename(pageId, block.id, remoteUrl);
      await downloadIfMissing(remoteUrl, localPath);
      urlMap.set(remoteUrl, localPath.replace(/\\/g, '/'));
    }

    if (block.type === 'file' && block.file.type === 'file') {
      const remoteUrl = block.file.file.url;
      const localPath = localFilename(pageId, block.id, remoteUrl);
      await downloadIfMissing(remoteUrl, localPath);
      urlMap.set(remoteUrl, localPath.replace(/\\/g, '/'));
    }

    for (const child of block.children ?? []) {
      await walk(child);
    }
  }

  for (const block of blocks) {
    await walk(block);
  }

  return urlMap;
}

/**
 * Delete all locally downloaded images that belong to a given page.
 * Files are identified by the "<pageId>-" prefix in the images directory.
 * @param {string} pageId
 */
export function deletePageImages(pageId) {
  if (!fs.existsSync(IMAGES_DIR)) return;
  const prefix = `${pageId}-`;
  for (const file of fs.readdirSync(IMAGES_DIR)) {
    if (file.startsWith(prefix)) {
      fs.rmSync(path.join(IMAGES_DIR, file));
      console.log(`  Deleted image: ${path.join(IMAGES_DIR, file)}`);
    }
  }
}

/**
 * Replace all remote image/file URLs in a Markdown string with local paths.
 * @param {string} markdown
 * @param {Map<string, string>} urlMap
 * @returns {string}
 */
export function rewriteUrls(markdown, urlMap) {
  let result = markdown;
  for (const [remote, local] of urlMap) {
    // Escape special regex characters in the remote URL
    const escaped = remote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), local);
  }
  return result;
}
