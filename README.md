<img width="1993" height="815" alt="Untitled" src="https://github.com/user-attachments/assets/6013d50b-bdaa-4ae5-b5e7-498c7c98f1cc" /># minimalist-notion-markdown-sync

![Uploading Untitled.jpg…]()

I plan every project in Notion. When I start coding, I want Claude Code to read those plans — but Claude Code reads files, not Notion pages. So I built this tool to sync the pages I care about to local Markdown files automatically, and keep them up to date as the plan evolves.

Tick `fetch to local` on any Notion page to include it in the sync. Unticking removes the local files. One command does the rest.

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
**[minimalist-notion-markdown-sync template](https://documentsaving.notion.site/34360263736280c0a381e67d73f59b00?v=343602637362809298ae000c3af1425c)**

Duplicate it to your workspace, then share it with your integration before running the sync.

## Getting Started

Before running setup, have these ready:
- **Notion API key** — get it from [notion.so/my-integrations](https://www.notion.so/my-integrations) (see [Getting Your Notion Credentials](#getting-your-notion-credentials) below)
- **Notion database ID** — the 32-char hex from your database URL
- The database must already be **shared with your integration**

```bash
# 1. Clone the repository
git clone https://github.com/rvakato/minimalist-notion-markdown-sync
cd minimalist-notion-markdown-sync

# 2. Install dependencies
npm install

# 3. Run the setup wizard — prompts for your Notion credentials and writes .env
npm run setup

# 4. Run the sync
npm run sync
```

## Getting Your Notion Credentials

### NOTION_API_KEY

This is the secret token that lets the tool talk to your Notion workspace.

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations) and sign in
2. Click **New integration**
3. Give it a name (e.g. `markdown-sync`), select your workspace, and leave the type as **Internal**
4. Click **Save** — Notion will show you the integration page
5. Under **Secrets**, click **Show** next to the Internal Integration Token, then **Copy** — this is your `NOTION_API_KEY`

> Keep this token private. Anyone with it can read (and modify) any database you share with the integration.

### NOTION_DATABASE_ID

This identifies which database to sync. If you duplicated the template, open it in your workspace — otherwise open any Notion database you want to sync.

1. Open the database in your browser (it must be a full-page database, not an inline one)
2. The URL looks like:
   ```
   https://www.notion.so/your-workspace/My-Database-34360263736280ababd2f8e818c4a584?v=...
   ```
3. Copy the 32-character hex string at the end of the path, before the `?` — in the example above that's `34360263736280ababd2f8e818c4a584`. This is your `NOTION_DATABASE_ID`

> **Important:** the database must be shared with your integration before it will appear in API results. Open the database → click **Share** (top right) → search for your integration name → click **Invite**. If you skip this step the sync will return zero pages.

### .env file

Create a `.env` file in the project root (it is gitignored, so it will never be committed):

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
