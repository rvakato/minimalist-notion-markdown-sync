import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

/**
 * Return true if the page's "fetch to local" checkbox property is checked.
 * Pages without this property are excluded.
 * @param {Object} page - Notion page object
 * @returns {boolean}
 */
function isFetchEnabled(page) {
  const prop = Object.values(page.properties).find(
    (p) => p.type === 'checkbox' && p.id !== undefined
  );
  // Find by known name first, fall back to any checkbox property
  const fetchProp =
    page.properties['fetch to local'] ?? prop;
  return fetchProp?.checkbox === true;
}

/**
 * Fetch all pages from the configured Notion database where "fetch to local"
 * is checked. Handles pagination automatically.
 * @returns {Promise<Array>} Array of Notion page objects
 */
export async function fetchAllPages() {
  const pages = [];
  let cursor = undefined;

  do {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      start_cursor: cursor,
      page_size: 100,
    });

    pages.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return pages.filter(isFetchEnabled);
}

/**
 * Fetch all blocks for a given page, recursively expanding children.
 * @param {string} blockId - Page ID or parent block ID
 * @returns {Promise<Array>} Flat-ish array of blocks (children nested under .children)
 */
export async function fetchBlocksRecursively(blockId) {
  const blocks = [];
  let cursor = undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      if (block.has_children) {
        block.children = await fetchBlocksRecursively(block.id);
      }
      blocks.push(block);
    }

    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return blocks;
}

/**
 * Extract plain-text title from a Notion page object.
 * @param {Object} page - Notion page object
 * @returns {string}
 */
export function getPageTitle(page) {
  const titleProp = Object.values(page.properties).find(
    (prop) => prop.type === 'title'
  );
  if (!titleProp || titleProp.title.length === 0) return 'Untitled';
  return titleProp.title.map((t) => t.plain_text).join('');
}
