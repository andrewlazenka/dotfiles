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

Store handwritten skills as `.agents/skills/<name>/SKILL.md`, then copy all of
them into the global skill directories for Pi, Claude Code, and OpenCode:

```sh
sync-agent-skills
```

The script uses `npx skills add` with copy mode. Run it again after changing a
local skill.
