import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const STORE_KEY_REPO_PATH = 'git_repo_path';

interface InsomniaStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

interface InsomniaApp {
  alert(title: string, message: string): Promise<void>;
  prompt(title: string, options: {
    label: string;
    defaultValue: string;
    submitName: string;
    cancelable: boolean;
  }): Promise<string | null>;
}

interface InsomniaContext {
  store: InsomniaStore;
  app: InsomniaApp;
}

async function getRepoPath(context: InsomniaContext): Promise<string | null> {
  const stored = await context.store.getItem(STORE_KEY_REPO_PATH);
  if (stored) return stored;

  const path = await context.app.prompt('Git Pull Rebase', {
    label: 'Git repository directory (absolute path)',
    defaultValue: '',
    submitName: 'Save and run',
    cancelable: true,
  });

  if (!path) return null;

  await context.store.setItem(STORE_KEY_REPO_PATH, path);
  return path;
}

async function runGitCommand(context: InsomniaContext, command: string): Promise<void> {
  const repoPath = await getRepoPath(context);
  if (!repoPath) return;

  try {
    const { stdout, stderr } = await execAsync(command, { cwd: repoPath });
    const output = (stdout || stderr || '').trim() || 'Completed with no changes.';
    await context.app.alert(`✓ ${command}`, output);
  } catch (error: unknown) {
    const err = error as { stderr?: string; stdout?: string; message: string };
    const msg = (err.stderr || err.stdout || err.message).trim();
    await context.app.alert(`✗ ${command}`, msg);
  }
}

module.exports.workspaceActions = [
  {
    label: 'Git Pull Rebase',
    icon: 'fa-code-branch',
    action: async (context: InsomniaContext) => {
      await runGitCommand(context, 'git pull --rebase');
    },
  },
  {
    label: 'Git - Configure directory',
    icon: 'fa-cog',
    action: async (context: InsomniaContext) => {
      const current = await context.store.getItem(STORE_KEY_REPO_PATH) || '';

      const newPath = await context.app.prompt('Configure Git directory', {
        label: 'Git repository directory (absolute path)',
        defaultValue: current,
        submitName: 'Save',
        cancelable: true,
      });

      if (newPath != null) {
        await context.store.setItem(STORE_KEY_REPO_PATH, newPath);
        await context.app.alert('Configuration saved', `Directory: ${newPath}`);
      }
    },
  },
];
