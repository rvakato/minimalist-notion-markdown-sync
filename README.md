# minimalist-notion-markdown-sync

Selectively sync pages from a Notion database to your local repository as Markdown files. Tick `fetch to local` on any Notion page to include it — unticking cleans up the local files automatically. Images are downloaded locally, only changed content is re-synced, and everything is committed and pushed in one step.

## Features

- **Selective sync** — only pages with `fetch to local` checked are synced; unticking a page removes its local files automatically
- **Full Markdown conversion** — paragraphs, headings, bullet/numbered lists, to-dos, tables (GFM), math equations (`$...$` / `$$...$$`), fenced code blocks with language, callouts, toggles, quotes, and dividers
- **Local image storage** — downloads all Notion-hosted images to an `images/` directory so links never expire
- **Dirty checking** — compares `last_edited_time` against a local state file and skips unchanged pages
- **Auto-delete** — removes local `.md` files and images when pages are deleted from Notion or unticked
- **One-command sync** — `npm run sync` fetches, converts, writes, commits, and pushes in one go
- **GitHub Actions schedule** — runs automatically at 11 AM and 11 PM GMT with a manual trigger option

## Prerequisites

- **Node.js** ≥ 18
- A **Notion integration** (internal integration token)
- A **Notion database** shared with that integration

## Database Template

A ready-to-use Notion database template is available here:
**[minimalist-notion-markdown-sync template](https://documentsaving.notion.site/minimalist-notion-markdown-sync-template-34360263736280ababd2f8e818c4a584)**

Duplicate it to your workspace, then share it with your integration before running the sync.

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/rvakato/minimalist-notion-markdown-sync
cd minimalist-notion-markdown-sync

# 2. Install dependencies
npm install

# 3. Configure credentials (see section below)
cp .env.example .env   # or edit .env directly

# 4. Run the sync
npm run sync
```

## Getting Your Notion Credentials

### NOTION_API_KEY

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration**, give it a name, and select the workspace
3. Copy the **Internal Integration Token** — this is your `NOTION_API_KEY`

### NOTION_DATABASE_ID

1. Open your Notion database in a browser
2. Look at the URL — it looks like:
   ```
   https://www.notion.so/your-workspace/<database-id>?v=...
   ```
3. Copy the 32-character hex string before the `?` — this is your `NOTION_DATABASE_ID`

> The database must be **shared with your integration**: open the database → click **Share** (top right) → search for your integration name → click **Invite**.

### .env file

```env
NOTION_API_KEY=ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Automated Sync via GitHub Actions

The included workflow (`.github/workflows/sync.yml`) runs the sync automatically on a schedule.

**1. Add repository secrets**

Go to your repository on GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, and add:

| Secret name | Value |
|---|---|
| `NOTION_API_KEY` | Your Notion integration token |
| `NOTION_DATABASE_ID` | Your database ID |

**2. Schedule**

The workflow fires at **11:00 AM and 11:00 PM GMT** every day:

```yaml
- cron: '0 11 * * *'
- cron: '0 23 * * *'
```

> During **BST** (late March – late October, UTC+1) these will fire at 12:00 PM and 12:00 AM local time instead.

**3. Manual trigger**

You can also trigger the sync on demand from the **Actions** tab → select **Notion Sync** → **Run workflow**.

## How It Works

```
Notion API
    │
    ▼
Fetch all pages (paginated)
    │
    ▼
Filter to pages where "fetch to local" is checked
    │
    ▼
Diff against sync-state.json  ──► Delete posts + images for removed/unticked pages
    │
    ▼  (new / modified pages only)
Fetch blocks recursively
    │
    ├──► Download images → images/<pageId>-<blockId>.<ext>
    │
    ▼
Convert blocks to Markdown
    │
    ▼
Rewrite image URLs to local paths
    │
    ▼
Write posts/<page-title>.md
    │
    ▼
Update sync-state.json
    │
    ▼
git add -A → git commit → git push
```

## Project Structure

```
.
├── .env                        # API credentials (not committed)
├── .github/
│   └── workflows/
│       └── sync.yml            # GitHub Actions scheduled workflow
├── sync.js                     # Main orchestrator — run with: npm run sync
├── src/
│   ├── notionClient.js         # Paginated database queries + recursive block fetching
│   ├── converter.js            # Notion block → Markdown conversion engine
│   ├── imageHandler.js         # Image download + URL rewriting
│   ├── stateManager.js         # Dirty checking via sync-state.json
│   ├── fileWriter.js           # Slugified filename generation + file I/O
│   └── gitOps.js               # git add / commit / push automation
├── images/                     # Downloaded assets (not committed)
├── posts/                      # Synced Markdown pages
├── sync-state.json             # Sync state cache (not committed)
└── package.json
```

## Configuration Reference

| Variable | Description |
|---|---|
| `NOTION_API_KEY` | Internal integration token from [notion.so/my-integrations](https://www.notion.so/my-integrations) |
| `NOTION_DATABASE_ID` | ID of the Notion database to sync (32-char hex from the page URL) |
