# Insomnia Toolkit

An [Insomnia](https://insomnia.rest/) plugin that lets you run `git pull --rebase` directly from the app, with a configurable repository directory.

## Features

- **Git Pull Rebase** -- Run `git pull --rebase` on a configured directory with one click.
- **Configurable directory** -- Set the path to your git repository. The path is persisted across sessions using Insomnia's plugin storage.
- **Visual feedback** -- Displays success or error messages in native Insomnia dialogs.

## Development

The plugin is written in TypeScript. Install dependencies and compile before installing:

```bash
npm install --ignore-scripts
npm run build
```

During development you can use `npm run dev` to watch for changes and recompile automatically.

## Installation

Copy the plugin folder into Insomnia's plugins directory:

| Platform | Path |
|----------|------|
| macOS    | `~/Library/Application Support/Insomnia/plugins/` |
| Windows  | `%APPDATA%\Insomnia\plugins\` |
| Linux    | `~/.config/Insomnia/plugins/` |

```bash
# macOS example
cp -r insomnia-plugin-toolkit ~/Library/Application\ Support/Insomnia/plugins/insomnia-plugin-toolkit
```

After installing, restart Insomnia or reload plugins from **Preferences > Plugins**.

## Usage

The plugin adds two **workspace actions**. To access them, open the workspace dropdown menu (click the `▼` icon next to your workspace name).

### Git Pull Rebase

Runs `git pull --rebase` on the configured repository directory.

- On first use, a prompt will ask for the **absolute path** to your git repository.
- The path is saved automatically and reused for future runs.
- A dialog will show the command output on success, or the error message on failure.

### Git - Configure Directory

Opens a prompt to view or change the configured repository path.

- The current path is shown as the default value.
- Enter a new absolute path and click **Save** to update it.

## Requirements

- **Git** must be installed and available in your system's `PATH`.
- The configured directory must be an existing git repository with a remote configured.
