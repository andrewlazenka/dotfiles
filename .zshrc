#### FIG ENV VARIABLES ####
# Please make sure this block is at the start of this file.
[ -s ~/.fig/shell/pre.sh ] && source ~/.fig/shell/pre.sh
#### END FIG ENV VARIABLES ####

# uncomment for zsh debug (slow startup)
# zmodload zsh/zprof

# load autocomplete from cache
autoload -Uz compinit
typeset -i updated_at=$(date +'%j' -r ~/.zcompdump 2>/dev/null || stat -f '%Sm' -t '%j' ~/.zcompdump 2>/dev/null)
if [ $(date +'%j') != $updated_at ]; then
  compinit -i
else
  compinit -C -i
fi
zmodload -i zsh/complist

# get name of current user
CURR_USER=$(id -un)

# path
export PATH="$HOME/.yarn/bin:$HOME/.config/yarn/global/node_modules/.bin:$PATH"
export PATH="$HOME/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin:$PATH"
export PATH="$HOME/flutter/bin:$PATH"

# exports
export EDITOR=code-insiders

# normal brew nvm shell config lines minus the 2nd one
# lazy loading the bash completions does not save us meaningful shell startup time, so we won't do it
export NVM_DIR="$HOME/.nvm"
source $(brew --prefix nvm)/nvm.sh
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

DEFAULT_NODE_VER='default';
while [ -s "$NVM_DIR/alias/$DEFAULT_NODE_VER" ]; do
  DEFAULT_NODE_VER="$(<$NVM_DIR/alias/$DEFAULT_NODE_VER)"
done;

export PATH="$NVM_DIR/versions/node/v${DEFAULT_NODE_VER#v}/bin:$PATH"
alias nvm='unalias nvm; [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" --no-use; nvm'

# terminal history opts
HISTFILE=$HOME/.zsh_history
HISTSIZE=50000
SAVEHIST=10000

# zsh config
setopt hist_expire_dups_first
setopt hist_ignore_all_dups
setopt hist_reduce_blanks
setopt inc_append_history
setopt share_history
setopt auto_cd
setopt auto_pushd
setopt pushd_ignore_dups
setopt pushdminus
setopt auto_list
setopt auto_menu
# setopt always_to_end
plugins=(zsh-autosuggestions)

# spaceship prompt config
SPACESHIP_PROMPT_ORDER=(
	time
  user          # Username section
  host          # Hostname section
  dir           # Current directory section
  git           # Git section (git_branch + git_status)
  hg            # Mercurial section (hg_branch  + hg_status)
  jobs          # Background jobs indicator
  exit_code     # Exit code section
)
SPACESHIP_PROMPT_ADD_NEWLINE=false
SPACESHIP_GIT_SYMBOL='\0'
SPACESHIP_TIME_SHOW=true

# load zsh packages
source <(antibody init)
antibody bundle zdharma/fast-syntax-highlighting
antibody bundle zsh-users/zsh-autosuggestions
antibody bundle zsh-users/zsh-completions
antibody bundle zsh-users/zsh-history-substring-search
antibody bundle denysdovhan/spaceship-prompt

# keybindings
bindkey '^[[A' history-substring-search-up
bindkey '^[[B' history-substring-search-down

# improve autocompletion style
zstyle ':completion:*' menu select # select completions with arrow keys
zstyle ':completion:*' group-name ''
zstyle ':completion:::::' completer _expand _complete _ignored _approximate # enable approximate matches

# aliases
alias cat="bat"
alias code="code-insiders"
alias dc="docker compose"
alias dcu="dc up"
alias de="docker exec"
alias deit="de -it"
alias dprune="docker system prune -a"
alias fzf='fzf --preview "bat --style=numbers --color=always {}"'
alias gs="git status"
alias gcm="git commit -m"
alias gpo="git push origin"
alias gpuo="git pull origin"
alias gaa="git add --all"
alias gc="git checkout"
alias gcb="gc -b"
alias gd="git diff"
alias gdf="git diff-tree --no-commit-id --name-only -r $1"
alias ghrepo="gh repo view --web"
alias current-branch="git rev-parse --abbrev-ref HEAD"
alias ls="exa"
alias la="ls -la"
alias profile="code ~/.zshrc"
alias refresh="source ~/.zshrc"
alias search=rg
alias 💪🏻="curl"

function hpr {
	if [ -z "$1" ]; then
		echo "Please provide a branch name"
		return 1
	elif [ -z "$2" ]; then
		echo "Please provide a pull request title"
		return 1
	else
		githubLink=$(hub pull-request -b $1 -m $2)
		open -a "Google Chrome" $githubLink
	fi
}

# functions
function packsearch {
	if [ -z "$1" ]; then
		echo "Please provide a package name to search"
		return 1
	else
		open -a "Google Chrome" https://www.npmjs.com/package/$1
	fi
}

function clear_stash {
	if [ -z "$1" ]; then
		echo "Please provide the highest index show from 'git stash list'"
		return 1
	else
		STASHINDEX=$1
		while [ $STASHINDEX -gt -1 ]; do
			git stash drop stash@{$STASHINDEX}
			let STASHINDEX=STASHINDEX-1
		done
	fi
}

function fif {
  if [ ! "$#" -gt 1 ]; then echo "Need a string to search for!"; return 1; fi
  rg --files-with-matches --no-messages -g "!{.git,node_modules}" $1 | fzf --preview "highlight -O ansi -l {} 2> /dev/null | rg --colors 'match:bg:yellow' --ignore-case --pretty --context 10 $1 || rg --ignore-case --pretty --context 10 $1 {}"
}

function port_kill() {
	kill -9 $(lsof -ti tcp:$1)
}

function ws() {
	code /Users/$CURR_USER/Documents/Workspaces/$1.code-workspace
}

function node-clean() {
	if test -f ./yarn.lock; then
		rm ./yarn.lock
		echo "Removed Yarn Lock"
	fi

	if test -f ./package-lock.json; then
		rm ./package-lock.json
		echo "Removed Package Lock"
	fi

	if test -d ./node_modules; then
		rm -rf ./node_modules
		echo "Removed Node Modules"
	fi
}

function mkcdir () {
	mkdir -p -- "$1" && cd -P -- "$1"
}

# uncomment for zsh debug (slow startup)
# zprof

#### FIG ENV VARIABLES ####
# Please make sure this block is at the end of this file.
[ -s ~/.fig/fig.sh ] && source ~/.fig/fig.sh
#### END FIG ENV VARIABLES ####
