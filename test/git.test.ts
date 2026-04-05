import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { InsomniaContext } from '../src/types'
import { STORE_KEY_REPO_PATH } from '../src/git'

const { mockExec } = vi.hoisted(() => ({
  mockExec: vi.fn(),
}))

vi.mock('child_process', () => ({
  exec: mockExec,
}))

function createMockContext(overrides?: { storedPath?: string | null; promptResult?: string | null }): InsomniaContext {
  const store = new Map<string, string>()
  if (overrides?.storedPath) {
    store.set(STORE_KEY_REPO_PATH, overrides.storedPath)
  }

  return {
    store: {
      getItem: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value)
        return Promise.resolve()
      }),
    },
    app: {
      alert: vi.fn(() => Promise.resolve()),
      prompt: vi.fn(() => Promise.resolve(overrides?.promptResult ?? null)),
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getRepoPath', () => {
  it('should return stored path without prompting', async () => {
    const { getRepoPath } = await import('../src/git')
    const ctx = createMockContext({ storedPath: '/my/repo' })

    const result = await getRepoPath(ctx)

    expect(result).toBe('/my/repo')
    expect(ctx.app.prompt).not.toHaveBeenCalled()
  })

  it('should prompt and save the result when no stored path', async () => {
    const { getRepoPath } = await import('../src/git')
    const ctx = createMockContext({ promptResult: '/new/repo' })

    const result = await getRepoPath(ctx)

    expect(result).toBe('/new/repo')
    expect(ctx.app.prompt).toHaveBeenCalled()
    expect(ctx.store.setItem).toHaveBeenCalledWith(STORE_KEY_REPO_PATH, '/new/repo')
  })

  it('should return null when user cancels the prompt', async () => {
    const { getRepoPath } = await import('../src/git')
    const ctx = createMockContext({ promptResult: null })

    const result = await getRepoPath(ctx)

    expect(result).toBeNull()
    expect(ctx.store.setItem).not.toHaveBeenCalled()
  })
})

describe('runGitCommand', () => {
  it('should show success alert with command output', async () => {
    mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: Function) => {
      cb(null, { stdout: 'Already up to date.\n', stderr: '' })
    })

    const { runGitCommand } = await import('../src/git')
    const ctx = createMockContext({ storedPath: '/my/repo' })
    await runGitCommand(ctx, 'git pull --rebase')

    expect(ctx.app.alert).toHaveBeenCalledWith('✓ git pull --rebase', 'Already up to date.')
  })

  it('should show error alert when command fails', async () => {
    mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: Function) => {
      const err = new Error('command failed') as Error & { stderr?: string }
      err.stderr = 'fatal: not a git repository'
      cb(err)
    })

    const { runGitCommand } = await import('../src/git')
    const ctx = createMockContext({ storedPath: '/my/repo' })
    await runGitCommand(ctx, 'git pull --rebase')

    expect(ctx.app.alert).toHaveBeenCalledWith('✗ git pull --rebase', 'fatal: not a git repository')
  })

  it('should do nothing when user cancels path prompt', async () => {
    const { runGitCommand } = await import('../src/git')
    const ctx = createMockContext({ promptResult: null })
    await runGitCommand(ctx, 'git pull --rebase')

    expect(ctx.app.alert).not.toHaveBeenCalled()
  })
})
