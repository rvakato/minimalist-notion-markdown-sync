import readline from 'readline';
import fs from 'fs';

const ENV_FILE = '.env';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log('=== minimalist-notion-markdown-sync setup ===\n');

  if (fs.existsSync(ENV_FILE)) {
    const overwrite = await ask('.env already exists. Overwrite? (y/N): ');
    if (overwrite.trim().toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('\nYou can find these values at https://www.notion.so/my-integrations\n');

  const apiKey = await ask('Notion API key (ntn_...): ');
  if (!apiKey.trim()) {
    console.error('API key cannot be empty.');
    rl.close();
    process.exit(1);
  }

  const dbId = await ask('Notion database ID (32-char hex): ');
  if (!dbId.trim()) {
    console.error('Database ID cannot be empty.');
    rl.close();
    process.exit(1);
  }

  const gitAnswer = await ask('Use Git version control? Commits and pushes after each sync. (y/N): ');
  const useGit = gitAnswer.trim().toLowerCase() === 'y';

  fs.writeFileSync(
    ENV_FILE,
    `NOTION_API_KEY=${apiKey.trim()}\nNOTION_DATABASE_ID=${dbId.trim()}\nUSE_GIT=${useGit}\n`,
    'utf8'
  );

  console.log('\n.env created successfully.');
  console.log(`Git version control: ${useGit ? 'enabled' : 'disabled'}`);
  console.log('\nMake sure your database is shared with your Notion integration,');
  console.log('then run: npm run sync\n');

  rl.close();
}

main().catch((err) => {
  console.error('Setup failed:', err);
  rl.close();
  process.exit(1);
});
