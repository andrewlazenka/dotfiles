# dotfiles

My opinionated macOS development environment, shell configuration, application
settings, and agent tooling. These files are primarily intended for my own
machines; review the scripts and `Brewfile` before installing them elsewhere.

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

Several shell files currently expect the repository at the path below (macOS's
default filesystem treats `Code` and `code` identically):

```sh
mkdir -p ~/Code/andrewlazenka
cd ~/Code/andrewlazenka
git clone https://github.com/andrewlazenka/dotfiles.git
cd dotfiles
```

Before proceeding, review `Brewfile`, `.macos`, and the scripts under `setup/`.
They encode personal application choices and system preferences.

### 3. Run the main bootstrap

```sh
./setup/fresh.sh
```

The bootstrap:

1. installs Homebrew if necessary and installs missing `Brewfile` dependencies;
2. links this repository's `.zshrc` and selects Zsh as the login shell;
3. links each directory under `.config/` into `~/.config` (existing items are
   moved to adjacent `.bak` paths);
4. installs the configured Node, Ruby, and PHP versions with `mise`; and
5. links the Pi agent configuration, installs Pi and its extension dependencies,
   and downloads Chromium for Playwright.

Open a new terminal when it finishes. If `chsh` requests a password, enter the
current macOS account password.

### 4. Finish the interactive and optional setup

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
├── Brewfile           Homebrew packages, applications, and fonts
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

Review the declared packages in `Brewfile`, then update Homebrew and install any
missing dependencies with:

```sh
brew-update
brew-update --check
```
