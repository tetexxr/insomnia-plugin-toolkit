import type { InsomniaContext } from './types'
import { runGitCommand, getSelectedRepo, STORE_KEY_REPO } from './git'

export const workspaceActions = [
  {
    label: 'Git Pull Rebase',
    icon: 'fa-code-branch',
    action: async (context: InsomniaContext) => {
      await runGitCommand(context, 'git pull --rebase')
    }
  },
  {
    label: 'Git - Select repository',
    icon: 'fa-cog',
    action: async (context: InsomniaContext) => {
      await context.store.setItem(STORE_KEY_REPO, '')
      const repo = await getSelectedRepo(context)
      if (repo) {
        await context.app.alert('Repository selected', `${repo.branch} @ ${repo.remote}`)
      }
    }
  }
]
