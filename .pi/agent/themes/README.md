# Tokyo Night pi themes

Available theme names in pi `/settings`:

- `tokyonight-night`
- `tokyonight-storm`
- `tokyonight-moon`
- `tokyonight-day`

Notes:

- Pi discovers custom themes from `~/.pi/agent/themes/*.json`
- In this dotfiles repo, `setup/config.sh` and `setup.sh` symlink `.pi/agent/themes` to `~/.pi/agent/themes`
- After linking themes, restart pi or run `/reload`
- Current default in `.pi/agent/settings.json` is `tokyonight-night`
