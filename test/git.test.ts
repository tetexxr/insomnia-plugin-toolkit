import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { InsomniaContext } from '../src/types'
import type { GitRepo } from '../src/git'

const { mockExec } = vi.hoisted(() => ({
  mockExec: vi.fn()
}))

const { mockReaddir, mockReadFile, mockMkdtemp, mockRm } = vi.hoisted(() => ({
  mockReaddir: vi.fn(),
  mockReadFile: vi.fn(),
  mockMkdtemp: vi.fn(),
  mockRm: vi.fn()
}))

vi.mock('child_process', () => ({
  exec: mockExec
}))

vi.mock('fs/promises', () => ({
  readdir: mockReaddir,
  readFile: mockReadFile,
  mkdtemp: mockMkdtemp,
  rm: mockRm
}))

vi.mock('os', () => ({
  homedir: () => '/fake',
  tmpdir: () => '/tmp'
}))

// getInsomniaDataDir() with mocked homedir '/fake' on darwin
const FAKE_DATA_DIR = '/fake/Library/Application Support/Insomnia'
const FAKE_GIT_CONFIG = `[core]
	repositoryformatversion = 0
[remote "origin"]
	url = https://github.com/user/repo.git
	fetch = +refs/heads/*:refs/remotes/origin/*
[branch "main"]
	remote = origin
	merge = refs/heads/main
`

function createMockContext(overrides?: { storedRepo?: string | null; promptResult?: string | null }): InsomniaContext {
  const store = new Map<string, string>()
  if (overrides?.storedRepo) {
    store.set('selected_repo_path', overrides.storedRepo)
  }

  return {
    store: {
      getItem: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value)
        return Promise.resolve()
      })
    },
    app: {
      alert: vi.fn(() => Promise.resolve()),
      prompt: vi.fn(() => Promise.resolve(overrides?.promptResult ?? null))
    }
  }
}

function setupSingleRepo() {
  mockReaddir.mockResolvedValue(['git_abc123'])
  mockReadFile.mockResolvedValue(FAKE_GIT_CONFIG)
}

function setupMultipleRepos() {
  mockReaddir.mockResolvedValue(['git_abc123', 'git_def456'])
  mockReadFile.mockImplementation((path: string) => {
    if (path.includes('git_abc123')) return Promise.resolve(FAKE_GIT_CONFIG)
    return Promise.resolve(
      FAKE_GIT_CONFIG.replace('https://github.com/user/repo.git', 'https://github.com/user/other.git').replace(
        '"main"',
        '"develop"'
      )
    )
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockMkdtemp.mockResolvedValue('/tmp/insomnia-git-test')
  mockRm.mockResolvedValue(undefined)
})

describe('discoverRepos', () => {
  it('should find repos in the version-control/git directory', async () => {
    setupSingleRepo()
    const { discoverRepos } = await import('../src/git')

    const repos = await discoverRepos(FAKE_DATA_DIR)

    expect(repos).toHaveLength(1)
    expect(repos[0].remote).toBe('https://github.com/user/repo.git')
    expect(repos[0].branch).toBe('main')
  })

  it('should return empty array when no repos exist', async () => {
    mockReaddir.mockRejectedValue(new Error('ENOENT'))
    const { discoverRepos } = await import('../src/git')

    const repos = await discoverRepos(FAKE_DATA_DIR)

    expect(repos).toHaveLength(0)
  })

  it('should skip entries that are not git_ directories', async () => {
    mockReaddir.mockResolvedValue(['git_abc123', 'something_else', '.DS_Store'])
    mockReadFile.mockResolvedValue(FAKE_GIT_CONFIG)
    const { discoverRepos } = await import('../src/git')

    const repos = await discoverRepos(FAKE_DATA_DIR)

    expect(repos).toHaveLength(1)
  })
})

describe('getSelectedRepo', () => {
  it('should auto-select when only one repo exists', async () => {
    setupSingleRepo()
    const { getSelectedRepo } = await import('../src/git')
    const ctx = createMockContext()

    const repo = await getSelectedRepo(ctx)

    expect(repo).not.toBeNull()
    expect(repo!.remote).toBe('https://github.com/user/repo.git')
    expect(ctx.app.prompt).not.toHaveBeenCalled()
  })

  it('should return stored repo if still valid', async () => {
    setupSingleRepo()
    const { getSelectedRepo } = await import('../src/git')
    const storedPath = `${FAKE_DATA_DIR}/version-control/git/git_abc123`
    const ctx = createMockContext({ storedRepo: storedPath })

    const repo = await getSelectedRepo(ctx)

    expect(repo).not.toBeNull()
    expect(repo!.path).toBe(storedPath)
  })

  it('should prompt when multiple repos exist', async () => {
    setupMultipleRepos()
    const { getSelectedRepo } = await import('../src/git')
    const ctx = createMockContext({ promptResult: '2' })

    const repo = await getSelectedRepo(ctx)

    expect(ctx.app.prompt).toHaveBeenCalled()
    expect(repo).not.toBeNull()
    expect(repo!.remote).toBe('https://github.com/user/other.git')
  })

  it('should return null when user cancels selection', async () => {
    setupMultipleRepos()
    const { getSelectedRepo } = await import('../src/git')
    const ctx = createMockContext({ promptResult: null })

    const repo = await getSelectedRepo(ctx)

    expect(repo).toBeNull()
  })

  it('should show alert when no repos found', async () => {
    mockReaddir.mockRejectedValue(new Error('ENOENT'))
    const { getSelectedRepo } = await import('../src/git')
    const ctx = createMockContext()

    const repo = await getSelectedRepo(ctx)

    expect(repo).toBeNull()
    expect(ctx.app.alert).toHaveBeenCalledWith('No repos found', expect.any(String))
  })
})

describe('runGitCommand', () => {
  it('should run command with --git-dir and --work-tree flags', async () => {
    setupSingleRepo()
    mockExec.mockImplementation((_cmd: string, cb: Function) => {
      cb(null, { stdout: 'Already up to date.\n', stderr: '' })
    })

    const { runGitCommand } = await import('../src/git')
    const ctx = createMockContext()
    await runGitCommand(ctx, 'git pull --rebase')

    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('--git-dir='), expect.any(Function))
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('pull --rebase'), expect.any(Function))
    expect(ctx.app.alert).toHaveBeenCalledWith('✓ git pull --rebase', 'Already up to date.')
  })

  it('should show error alert when command fails', async () => {
    setupSingleRepo()
    mockExec.mockImplementation((_cmd: string, cb: Function) => {
      const err = new Error('command failed') as Error & { stderr?: string }
      err.stderr = 'fatal: could not read from remote'
      cb(err)
    })

    const { runGitCommand } = await import('../src/git')
    const ctx = createMockContext()
    await runGitCommand(ctx, 'git pull --rebase')

    expect(ctx.app.alert).toHaveBeenCalledWith('✗ git pull --rebase', 'fatal: could not read from remote')
  })

  it('should do nothing when no repo is selected', async () => {
    mockReaddir.mockRejectedValue(new Error('ENOENT'))

    const { runGitCommand } = await import('../src/git')
    const ctx = createMockContext()
    await runGitCommand(ctx, 'git pull --rebase')

    expect(mockExec).not.toHaveBeenCalled()
  })
})
