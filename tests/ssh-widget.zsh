#!/usr/bin/env zsh
set -eu

cd "${0:A:h:h}"
local fixture=$(mktemp -d)
trap 'rm -rf -- "$fixture"' EXIT
export HOME="$fixture"
mkdir -p "$HOME/.ssh"
printf '%s\n' \
    'Host prod staging prod' \
    '  HostName example.com' \
    'host backup # comment' \
    'Host * *.internal !excluded -oProxyCommand=bad' > "$HOME/.ssh/config"

bindkey() { :; }
zle() { [[ "$1" != accept-line ]] || accepted=yes; }
source functions/_ssh_connect
source .widgets

fzf() {
    local hosts=$(command cat)
    [[ "$hosts" == $'backup\nprod\nstaging' ]] || return 1
    print -r -- staging
}
BUFFER=original
accepted=no
_ssh_connect
[[ "$BUFFER" == 'ssh -- staging' && "$accepted" == yes ]]

# Cancellation must leave the current command untouched.
fzf() { return 130; }
BUFFER=original
accepted=no
_ssh_connect
[[ "$BUFFER" == original && "$accepted" == no ]]

# Even an unexpected selection must be quoted, not executed as shell syntax.
fzf() { print -r -- 'host;echo unsafe'; }
_ssh_connect
[[ "$BUFFER" == 'ssh -- host\;echo\ unsafe' ]]
print 'SSH widget tests passed'
