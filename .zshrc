# exports
export EDITOR=nvim
export STARSHIP_CONFIG="$HOME/Code/andrewlazenka/dotfiles/starship.toml"

# terminal history opts
HISTFILE=$HOME/.zsh_history
HISTSIZE=50000
SAVEHIST=50000

# zsh config
setopt INC_APPEND_HISTORY
setopt EXTENDED_HISTORY
setopt HIST_EXPIRE_DUPS_FIRST
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_ALL_DUPS
setopt HIST_FIND_NO_DUPS
setopt HIST_IGNORE_SPACE
setopt HIST_SAVE_NO_DUPS
setopt HIST_REDUCE_BLANKS
setopt SHARE_HISTORY
setopt AUTO_CD
setopt AUTO_PUSHD
setopt PUSHD_IGNORE_DUPS
setopt PUSHDMINUS
setopt AUTO_LIST
setopt AUTO_MENU
unsetopt HIST_VERIFY

# Compile stable Zsh files and refresh the bytecode when their source changes.
_compile_zsh_file() {
	emulate -L zsh
	local source_file="$1"
	local compiled_file="$source_file.zwc"

	[[ -r "$source_file" ]] || return 1
	if [[ ! -r "$compiled_file" || "$source_file" -nt "$compiled_file" ]]; then
		zcompile -R "$source_file" 2>/dev/null || return 1
	fi
}

# Cache generated shell integrations and refresh them after tool upgrades.
_cached_zsh_init() {
	emulate -L zsh
	local cache_name="$1"
	shift
	local cache_dir="${XDG_CACHE_HOME:-$HOME/.cache}/zsh"
	local cache_file="$cache_dir/$cache_name-init.zsh"
	local command_path="${commands[$1]-}"
	local temp_file="$cache_file.$$.tmp"

	[[ -n "$command_path" ]] || return 1
	command_path="${command_path:A}"

	if [[ ! -r "$cache_file" || "$command_path" -nt "$cache_file" ]]; then
		[[ -d "$cache_dir" ]] || command mkdir -p -- "$cache_dir"
		if "$@" >| "$temp_file"; then
			command mv -f -- "$temp_file" "$cache_file"
		else
			command rm -f -- "$temp_file"
			[[ -r "$cache_file" ]] || return 1
		fi
	fi

	typeset -g _zsh_init_cache_file="$cache_file"
}

# source dotfiles
for file in $HOME/Code/andrewlazenka/dotfiles/.{path,bash_prompt,exports,aliases,plugins,extra,widgets}; do
	[ -r "$file" ] && [ -f "$file" ] && source "$file";
done;
unset file;

# source functions
for file in $HOME/Code/andrewlazenka/dotfiles/functions/*; do
	[ -r "$file" ] && [ -f "$file" ] && source "$file";
done;
unset file;

export ATUIN_NOBIND="true"
if _cached_zsh_init atuin atuin init zsh --disable-up-arrow; then
	_compile_zsh_file "$_zsh_init_cache_file"
	source "$_zsh_init_cache_file"
fi

. "/opt/homebrew/opt/asdf/libexec/asdf.sh"

# This speeds up subsequent shells; Zsh ignores stale bytecode automatically.
_compile_zsh_file "$HOME/.zshrc"
unfunction _compile_zsh_file _cached_zsh_init
unset _zsh_init_cache_file
