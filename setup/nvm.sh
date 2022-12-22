#!/usr/bash/env bash

mkdir -p ~/.nvm
export NVM_DIR=~/.nvm
source $(brew --prefix nvm)/nvm.sh
nvm install 16.7.0
nvm alias default 16.7.0
