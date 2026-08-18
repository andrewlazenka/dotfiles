#!/usr/bin/env bash

# clear dock
dockutil --remove all

# add applications
dockutil --add "/Applications/Helium.app"
dockutil --add "/Applications/Obsidian.app"
dockutil --add "/Applications/Ghostty.app"
dockutil --add "/Applications/Linear.app"
dockutil --add "/Users/andrewlazenka/Applications/Chrome Apps.localized/Open WebUI.app"
dockutil --add "/Applications/Fastmail.app"

killall Dock
