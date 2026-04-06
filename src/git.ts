import { exec } from 'child_process'
import { readdir, readFile, mkdtemp, rm } from 'fs/promises'
import { homedir, tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'
import type { InsomniaContext } from './types'

const execAsync = promisify(exec)
export const STORE_KEY_REPO = 'selected_repo_path'

function getInsomniaDataDir(): string {
  const home = homedir()
  switch (process.platform) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'Insomnia')
    case 'win32':
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Insomnia')
    default:
      return join(home, '.config', 'Insomnia')
  }
}

export interface GitRepo {
  path: string
  gitDir: string
  remote: string
  branch: string
}

export async function discoverRepos(dataDir: string): Promise<GitRepo[]> {
  const gitBaseDir = join(dataDir, 'version-control', 'git')
  const repos: GitRepo[] = []

  let entries: string[]
  try {
    entries = await readdir(gitBaseDir)
  } catch {
    return repos
  }

  for (const entry of entries) {
    if (!entry.startsWith('git_')) continue

    const repoPath = join(gitBaseDir, entry)
    const gitDir = join(repoPath, 'git')

    try {
      const config = await readFile(join(gitDir, 'config'), 'utf-8')
      const remoteMatch = config.match(/url\s*=\s*(.+)/)
      const branchMatch = config.match(/\[branch "(.+?)"\]/)

      repos.push({
        path: repoPath,
        gitDir,
        remote: remoteMatch?.[1]?.trim() || 'unknown',
        branch: branchMatch?.[1] || 'unknown'
      })
    } catch {
      // skip repos with unreadable config
    }
  }

  return repos
}

export async function getSelectedRepo(context: InsomniaContext): Promise<GitRepo | null> {
  const dataDir = getInsomniaDataDir()
  const repos = await discoverRepos(dataDir)

  if (repos.length === 0) {
    await context.app.alert('No repos found', 'No Git Sync repositories found in Insomnia data directory.')
    return null
  }

  const storedPath = await context.store.getItem(STORE_KEY_REPO)
  if (storedPath) {
    const found = repos.find((r) => r.path === storedPath)
    if (found) return found
  }

  if (repos.length === 1) {
    await context.store.setItem(STORE_KEY_REPO, repos[0].path)
    return repos[0]
  }

  const listing = repos.map((r, i) => `${i + 1}. ${r.remote}`).join(' | ')
  const choice = await context.app.prompt('Select repository', {
    label: listing,
    defaultValue: '1',
    submitName: 'Select',
    cancelable: true
  })

  if (!choice) return null

  const index = parseInt(choice, 10) - 1
  if (index < 0 || index >= repos.length) {
    await context.app.alert('Invalid selection', `Please enter a number between 1 and ${repos.length}`)
    return null
  }

  await context.store.setItem(STORE_KEY_REPO, repos[index].path)
  return repos[index]
}

export async function runGitCommand(context: InsomniaContext, command: string): Promise<void> {
  const repo = await getSelectedRepo(context)
  if (!repo) return

  const tmpWorkTree = await mkdtemp(join(tmpdir(), 'insomnia-git-'))
  const git = `git --git-dir="${repo.gitDir}" --work-tree="${tmpWorkTree}"`

  try {
    await execAsync(`${git} checkout -f`)
    const subcommand = command.replace(/^git\s+/, '')
    const { stdout, stderr } = await execAsync(`${git} ${subcommand}`)
    const output = (stdout || stderr || '').trim() || 'Completed with no changes.'
    await context.app.alert(`✓ ${command}`, output)
  } catch (error: unknown) {
    const err = error as { stderr?: string; stdout?: string; message: string }
    const msg = (err.stderr || err.stdout || err.message).trim()
    await context.app.alert(`✗ ${command}`, msg)
  } finally {
    await rm(tmpWorkTree, { recursive: true, force: true })
  }
}
