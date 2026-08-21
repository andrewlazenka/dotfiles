# dotfiles

My opinionated macOS development environment, shell configuration, application
settings, and agent tooling. These files are primarily intended for my own
machines; review the setup scripts and Brewfiles before installing them elsewhere.

## Install on a new Mac

### 1. Prepare macOS

Install all available macOS updates, then install Apple's command-line tools:

```sh
xcode-select --install
```

Complete the installer before continuing. The setup installs a large collection
of Homebrew formulae, casks, and fonts, so an administrator account and a stable
internet connection are required.

### 2. Clone the repository

Several shell files currently expect the repository at the path below:

```sh
mkdir -p ~/code/andrewlazenka
cd ~/code/andrewlazenka
git clone https://github.com/andrewlazenka/dotfiles.git
cd dotfiles
```

Before proceeding, review `Brewfile.base`, the machine-specific Brewfiles,
`.macos`, and the scripts under `setup/`. They encode application choices and
system preferences.

### 3. Run the main bootstrap

Choose a Homebrew profile on the first run:

```sh
./setup/fresh.sh personal
# or
./setup/fresh.sh work
```

The selection is saved locally in the ignored `.brew-profile` file, so later
runs can use `./setup/fresh.sh` without an argument. The bootstrap:

1. installs Homebrew if necessary and installs dependencies from the shared and
   selected machine-specific Brewfiles;
2. links this repository's `.zshrc` and selects Zsh as the login shell;
3. links each directory under `.config/` into `~/.config` (existing items are
   moved to adjacent `.bak` paths);
4. installs the configured Node, Ruby, and PHP versions with `mise`; and
5. links the Pi agent configuration, installs Pi and its extension dependencies,
   and downloads Chromium for Playwright.

Open a new terminal when it finishes. If `chsh` requests a password, enter the
current macOS account password.

### 4. Set up or repair configuration symlinks

The main bootstrap runs this step automatically. If Homebrew was installed
manually, or the links need to be recreated, run:

```sh
./setup/config.sh
```

This links every top-level directory in the repository's `.config/` directory
into `~/.config/`, including Neovim and tmux:

```text
~/.config/nvim -> <dotfiles>/.config/nvim
~/.config/tmux -> <dotfiles>/.config/tmux
```

Existing files or directories are preserved with an adjacent `.bak` suffix.
Restart Neovim after creating the links. For tmux, either start a new server or
reload the configuration in an existing session:

```sh
tmux source-file ~/.config/tmux/tmux.conf
```

To recreate the Zsh link and select it as the login shell separately, run:

```sh
./setup/zsh.sh
```

### 5. Finish the interactive and optional setup

Configure Git identity (the script prompts for a name and email):

```sh
./setup/git.sh
```

Install tmux's plugin manager, then start tmux and press `Ctrl-Space` followed by
`I` to install plugins:

```sh
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
```

The following steps are deliberately not part of the main bootstrap:

```sh
./.macos          # apply opinionated macOS defaults; includes no-sleep settings
./setup/dock.sh   # replace the Dock; edit its personal paths/apps first
```

Finally, sign in to installed applications and authenticate tools as needed
(for example, `gh auth login`, 1Password, and Pi providers). Secrets and
machine-generated state are intentionally excluded from Git. Run
`sync-agent-skills` after opening a new shell to populate the global agent skill
directories.

> `setup.sh` is the separate GitHub Codespaces bootstrap; it is not the macOS
> installer.

## File structure

```text
.
├── .config/          Application configuration linked into ~/.config
├── .agents/skills/   Canonical, version-controlled agent skills
├── .pi/agent/        Pi settings, prompts, themes, and custom extensions
├── bin/               Personal commands added to PATH
├── functions/         Zsh functions sourced at startup
├── setup/             Focused macOS bootstrap and configuration scripts
├── .zshrc             Main Zsh startup file
├── .path              PATH configuration
├── .aliases           Shell aliases
├── .plugins           Zsh plugin and prompt initialization
├── .widgets           Custom Zsh widgets
├── .macos             macOS defaults
├── Brewfile.base      Homebrew dependencies shared by all machines
├── Brewfile.personal  Personal profile; includes Brewfile.base
├── Brewfile.work      Work profile; includes Brewfile.base
├── skills-lock.json   Locked remote agent skills
└── starship.toml      Starship prompt configuration
```

The repository is used in place rather than copied wholesale into `$HOME`.
Zsh sources shell fragments and functions directly from the clone, while
`setup/config.sh` creates per-application symlinks. `.agents/skills/` is the
source of truth for skills; generated `.claude/skills/` and `.pi/skills/` trees
are ignored.

## Zsh startup diagnostics

Benchmark clean, interactive, and login-interactive shell startup:

```sh
zsh-startup benchmark       # 30 measured runs
zsh-startup benchmark 100   # custom run count
```

Inspect function-level startup cost or produce a timestamped line-level trace:

```sh
zsh-startup profile
zsh-startup trace
zsh-startup trace /tmp/zsh-startup.log
```

The Zsh configuration compiles stable startup files to `.zwc` bytecode and
refreshes them when their source changes. Generated Atuin and Starship scripts
are stored under `~/.cache/zsh`; compiled files are local cache artifacts.

## Agent skills

The canonical skill tree is `.agents/skills/`. Store handwritten skills there,
or install remote skills at project scope so their source is recorded in the
tracked `skills-lock.json`:

```sh
npx skills add owner/repo --skill <name> --agent opencode --copy --yes
```

Update a tracked remote skill in place, then copy the canonical tree into the
global skill directories for Pi, Claude Code, and OpenCode:

```sh
npx skills update <name> --project --yes
sync-agent-skills
```

Run `sync-agent-skills` again after changing a handwritten skill as well.

## Homebrew

Shared dependencies live in `Brewfile.base`; `Brewfile.personal` and
`Brewfile.work` include it and declare profile-specific dependencies. The setup
saves the selected profile in `.brew-profile`.

Update Homebrew and install missing dependencies for the saved profile with:

```sh
brew-update
brew-update --check
```

Temporarily override the saved selection when needed:

```sh
brew-update --profile work
```

## Language runtimes with mise

The global mise configuration is linked from `.config/mise/config.toml` and
currently tracks the latest Node.js, Ruby, and PHP releases:

```toml
[tools]
node = "latest"
php = "latest"
ruby = "latest"
```

`setup/fresh.sh` installs these runtimes automatically. To install them again
without running the rest of the bootstrap:

```sh
./setup/mise.sh
```

Update every configured runtime to the latest matching release with:

```sh
mise-update
```

Open a new shell after initial setup so `mise activate zsh` takes effect. Check
the active versions at any time with `mise current`.
