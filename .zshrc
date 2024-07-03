# uncomment for zsh debug (slow startup)
# zmodload zsh/zprof

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

# source dotfiles
for file in $HOME/Code/andrewlazenka/dotfiles/.{path,bash_prompt,exports,aliases,functions,plugins,extra}; do
	[ -r "$file" ] && [ -f "$file" ] && source "$file";
done;
unset file;

eval "$(atuin init zsh --disable-up-arrow)"

# uncomment for zsh debug (slow startup)
# zprof

. "/opt/homebrew/opt/asdf/libexec/asdf.sh"
