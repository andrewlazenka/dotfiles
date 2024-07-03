#!/usr/bin/env bash

# clear dock
dockutil --remove all

# add applications
dockutil --add "/Applications/Firefox.app"
dockutil --add "/Applications/Spotify.app"
dockutil --add "/Applications/Rise.app"
dockutil --add "/Applications/Obsidian.app"
dockutil --add "/Applications/Numi.app"
dockutil --add "/Applications/Ghostty.app"
dockutil --add "/Applications/iTerm.app"

killall Dock
