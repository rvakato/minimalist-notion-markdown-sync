import { execSync } from 'child_process';

/**
 * Run a shell command synchronously, inheriting stdio so output is visible.
 * Throws on non-zero exit code.
 * @param {string} cmd
 */
function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

/**
 * Return true if there are any staged or unstaged changes in the working tree.
 * @returns {boolean}
 */
function hasChanges() {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  return status.trim().length > 0;
}

/**
 * Stage all changes, commit with a timestamped message, and push to origin.
 * Skips the commit + push if there is nothing to commit.
 */
export async function commitAndPush() {
  run('git add -A');

  if (!hasChanges()) {
    console.log('Nothing to commit — working tree is clean.');
    return;
  }

  const now = new Date().toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const message = `sync: auto-update from notion (${now})`;
  run(`git commit -m "${message}"`);
  run('git push');
}
