# Insomnia Toolkit

An [Insomnia](https://insomnia.rest/) plugin that adds advanced git commands to Insomnia's Git Sync feature. It auto-discovers the repositories managed by Insomnia and lets you run operations like `git pull --rebase` directly from the app.

## Features

- **Auto-discovery** -- Automatically finds Git Sync repositories in Insomnia's data directory.
- **Git Pull Rebase** -- Run `git pull --rebase` on the Insomnia repo with one click.
- **Repository selector** -- Choose which repo to operate on when multiple exist.
- **Visual feedback** -- Displays success or error messages in native Insomnia dialogs.

## Development

The plugin is written in TypeScript. Install dependencies and compile:

```bash
npm install --ignore-scripts
npm run build
```

During development you can use `npm run dev` to watch for changes and recompile automatically.

## Installation

Build the plugin and copy the necessary files into Insomnia's plugins directory:

| Platform | Plugins path |
|----------|-------------|
| macOS    | `~/Library/Application Support/Insomnia/plugins/` |
| Windows  | `%APPDATA%\Insomnia\plugins\` |
| Linux    | `~/.config/Insomnia/plugins/` |

```bash
npm run build

# macOS
PLUGIN_DIR=~/Library/Application\ Support/Insomnia/plugins/insomnia-plugin-toolkit
rm -rf "$PLUGIN_DIR"
mkdir -p "$PLUGIN_DIR"
cp -r dist package.json node_modules "$PLUGIN_DIR"
```

After installing, restart Insomnia or reload plugins from **Preferences > Plugins**.

## Usage

The plugin adds two **workspace actions**. To access them, open the workspace dropdown menu (click the `▼` icon next to your workspace name).

### Git Pull Rebase

Runs `git pull --rebase` on the selected Insomnia Git Sync repository.

### Git - Select repository

Lets you choose which Git Sync repository to operate on. The selection is persisted across sessions. If only one repository exists, it is selected automatically.

## Where does Insomnia store its Git Sync repositories?

Insomnia keeps a local clone for each Git Sync workspace inside its data directory:

| Platform | Path |
|----------|------|
| macOS    | `~/Library/Application Support/Insomnia/version-control/git/` |
| Windows  | `%APPDATA%\Insomnia\version-control\git\` |
| Linux    | `~/.config/Insomnia/version-control/git/` |

Each repository is stored in a subdirectory named `git_<uuid>/`.

## Requirements

- **Git** must be installed and available in your system's `PATH`.
- At least one workspace must be configured with **Git Sync** in Insomnia.
