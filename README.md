# dotfiles

My custom dotfiles used between machines.

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
