import type { InsomniaContext } from './types'
import { runGitCommand, STORE_KEY_REPO_PATH } from './git'

module.exports.workspaceActions = [
  {
    label: 'Git Pull Rebase',
    icon: 'fa-code-branch',
    action: async (context: InsomniaContext) => {
      await runGitCommand(context, 'git pull --rebase')
    }
  },
  {
    label: 'Git - Configure directory',
    icon: 'fa-cog',
    action: async (context: InsomniaContext) => {
      const current = (await context.store.getItem(STORE_KEY_REPO_PATH)) || ''

      const newPath = await context.app.prompt('Configure Git directory', {
        label: 'Git repository directory (absolute path)',
        defaultValue: current,
        submitName: 'Save',
        cancelable: true
      })

      if (newPath != null) {
        await context.store.setItem(STORE_KEY_REPO_PATH, newPath)
        await context.app.alert('Configuration saved', `Directory: ${newPath}`)
      }
    }
  }
]
