# exports
export EDITOR=code-insiders
export NVM_DIR=~/.nvm
export PATH=/Users/andrewlazenka/Library/Python/3.7/bin:$PATH
export ZSH=/Users/andrewlazenka/.oh-my-zsh
export ZSH_THEME="avit"
export FZF_DEFAULT_COMMAND='rg --files --no-ignore --hidden --follow -g "!{.git,node_modules}" 2> /dev/null'

# env vars
HISTSIZE=1000
SAVEHIST=1000
plugins=(zsh-autosuggestions)

# sources
source ~/.nvm/nvm.sh
source /Users/andrewlazenka/.oh-my-zsh/custom/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh
source $ZSH/oh-my-zsh.sh

# aliases
alias cat="bat"
alias code="code-insiders"
alias dc="docker-compose"
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
alias ls="exa"
alias la="ls -la"
alias profile="code ~/.zshrc"
alias read_hosts="cat /etc/hosts"
alias refresh="source ~/.zshrc"
alias search=rg

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
		while [  $STASHINDEX -gt -1 ]; do
			git stash drop stash@{$STASHINDEX}
			let STASHINDEX=STASHINDEX-1
		done
	fi
}

fif() {
  if [ ! "$#" -gt 1 ]; then echo "Need a string to search for!"; return 1; fi
  rg --files-with-matches --no-messages -g "!{.git,node_modules}" $1 | fzf --preview "highlight -O ansi -l {} 2> /dev/null | rg --colors 'match:bg:yellow' --ignore-case --pretty --context 10 $1 || rg --ignore-case --pretty --context 10 $1 {}"
}

port_kill () {
	kill -9 $(lsof -ti tcp:$1)
}

ws () {
	code /Users/andrewlazenka/Documents/VSCode\ Workspaces/$1.code-workspace
}


# npm packages

# tabtab source for serverless package
# uninstall by removing these lines or running `tabtab uninstall serverless`
[[ -f /Users/andrewlazenka/.nvm/versions/node/v8.11.4/lib/node_modules/serverless/node_modules/tabtab/.completions/serverless.zsh ]] && . /Users/andrewlazenka/.nvm/versions/node/v8.11.4/lib/node_modules/serverless/node_modules/tabtab/.completions/serverless.zsh
# tabtab source for sls package
# uninstall by removing these lines or running `tabtab uninstall sls`
[[ -f /Users/andrewlazenka/.nvm/versions/node/v8.11.4/lib/node_modules/serverless/node_modules/tabtab/.completions/sls.zsh ]] && . /Users/andrewlazenka/.nvm/versions/node/v8.11.4/lib/node_modules/serverless/node_modules/tabtab/.completions/sls.zsh

# tabtab source for slss package
# uninstall by removing these lines or running `tabtab uninstall slss`
[[ -f /Users/andrewlazenka/.nvm/versions/node/v8.10.0/lib/node_modules/serverless/node_modules/tabtab/.completions/slss.zsh ]] && . /Users/andrewlazenka/.nvm/versions/node/v8.10.0/lib/node_modules/serverless/node_modules/tabtab/.completions/slss.zsh

export PATH="$HOME/.yarn/bin:$HOME/.config/yarn/global/node_modules/.bin:$PATH"
export PATH="$HOME/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin:$PATH"
