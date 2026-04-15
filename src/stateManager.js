import fs from 'fs';

const STATE_FILE = 'sync-state.json';

/**
 * Load the persisted sync state from disk.
 * Returns an empty object if the state file does not exist yet.
 * Shape: { [pageId]: { lastEditedTime: string, outputFile: string } }
 * @returns {Object}
 */
export function loadState() {
  if (!fs.existsSync(STATE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Write the current state object back to disk.
 * @param {Object} state
 */
export function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Determine which pages need to be synced and which local files should be deleted.
 *
 * @param {Array}  livePages  - Page objects returned by the Notion API
 * @param {Object} state      - Current persisted state
 * @returns {{ toSync: Array, toDelete: Array }}
 *   toSync  — Notion page objects whose last_edited_time differs from state
 *   toDelete — { pageId, outputFile } entries for pages no longer in Notion
 */
export function diffPages(livePages, state) {
  const liveIds = new Set(livePages.map((p) => p.id));

  // Pages that have been deleted in Notion
  const toDelete = Object.entries(state)
    .filter(([pageId]) => !liveIds.has(pageId))
    .map(([pageId, entry]) => ({ pageId, outputFile: entry.outputFile }));

  // Pages that are new or have been modified
  const toSync = livePages.filter((page) => {
    const entry = state[page.id];
    if (!entry) return true; // new page
    return entry.lastEditedTime !== page.last_edited_time; // modified
  });

  return { toSync, toDelete };
}
