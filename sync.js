import dotenv from 'dotenv';
dotenv.config();

import { fetchAllPages, fetchBlocksRecursively, getPageTitle } from './src/notionClient.js';
import { blocksToMarkdown } from './src/converter.js';
import { downloadPageImages, rewriteUrls, deletePageImages } from './src/imageHandler.js';
import { loadState, saveState, diffPages } from './src/stateManager.js';
import { deriveFilename, writeMarkdownFile, deleteMarkdownFile } from './src/fileWriter.js';
import { commitAndPush } from './src/gitOps.js';

async function main() {
  console.log('=== Notion → Git Sync ===\n');

  // 1. Fetch all live pages from Notion
  console.log('Fetching pages from Notion...');
  const livePages = await fetchAllPages();
  console.log(`  Found ${livePages.length} page(s)\n`);

  // 2. Load persisted state and diff against live pages
  const state = loadState();
  const { toSync, toDelete } = diffPages(livePages, state);
  console.log(`  To sync:   ${toSync.length} page(s)`);
  console.log(`  To delete: ${toDelete.length} page(s)\n`);

  // 3. Delete local files for pages removed from Notion
  for (const { pageId, outputFile } of toDelete) {
    console.log(`Deleting removed page: ${outputFile}`);
    deleteMarkdownFile(outputFile);
    deletePageImages(pageId);
    delete state[pageId];
  }

  // 4. Sync new / modified pages
  const usedSlugs = new Set(
    Object.values(state).map((e) => e.outputFile.replace(/\.md$/, ''))
  );

  for (const page of toSync) {
    const title = getPageTitle(page);
    console.log(`Syncing: "${title}"`);

    // Fetch blocks
    const blocks = await fetchBlocksRecursively(page.id);

    // Download images and build URL rewrite map
    const urlMap = await downloadPageImages(blocks, page.id);

    // Convert blocks to Markdown
    let markdown = blocksToMarkdown(blocks);

    // Rewrite remote image URLs to local paths
    markdown = rewriteUrls(markdown, urlMap);

    // Determine output filename
    const filename = state[page.id]?.outputFile ?? deriveFilename(title, page.id, usedSlugs);

    // Write file
    writeMarkdownFile(filename, markdown);
    console.log(`  Written: ${filename}`);

    // Update state entry
    state[page.id] = {
      lastEditedTime: page.last_edited_time,
      outputFile: filename,
    };
  }

  // 5. Persist updated state
  saveState(state);

  // 6. Git commit and push
  console.log('\nCommitting changes to Git...');
  await commitAndPush();

  console.log('\nSync complete.');
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
