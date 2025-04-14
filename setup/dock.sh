#!/usr/bin/env bash

# clear dock
dockutil --remove all

# add applications
dockutil --add "/Applications/Zen.app"
dockutil --add "/Applications/Obsidian.app"
dockutil --add "/Applications/Cursor.app"
dockutil --add "/Applications/Windsurf.app"
dockutil --add "/Applications/Ghostty.app"
dockutil --add "/Applications/Linear.app"

killall Dock
