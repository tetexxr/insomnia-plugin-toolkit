import { exec } from 'child_process'
import { promisify } from 'util'
import type { InsomniaContext } from './types'

const execAsync = promisify(exec)
export const STORE_KEY_REPO_PATH = 'git_repo_path'

export async function getRepoPath(context: InsomniaContext): Promise<string | null> {
  const stored = await context.store.getItem(STORE_KEY_REPO_PATH)
  if (stored) return stored

  const path = await context.app.prompt('Git Pull Rebase', {
    label: 'Git repository directory (absolute path)',
    defaultValue: '',
    submitName: 'Save and run',
    cancelable: true,
  })

  if (!path) return null

  await context.store.setItem(STORE_KEY_REPO_PATH, path)
  return path
}

export async function runGitCommand(context: InsomniaContext, command: string): Promise<void> {
  const repoPath = await getRepoPath(context)
  if (!repoPath) return

  try {
    const { stdout, stderr } = await execAsync(command, { cwd: repoPath })
    const output = (stdout || stderr || '').trim() || 'Completed with no changes.'
    await context.app.alert(`✓ ${command}`, output)
  } catch (error: unknown) {
    const err = error as { stderr?: string; stdout?: string; message: string }
    const msg = (err.stderr || err.stdout || err.message).trim()
    await context.app.alert(`✗ ${command}`, msg)
  }
}
