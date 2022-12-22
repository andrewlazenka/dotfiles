#!/usr/bash/env bash

# clear dock
dockutil --remove all

# add applications
dockutil --add "/Applications/Google Chrome.app"
dockutil --add "/Applications/Spotify.app"
dockutil --add "/Applications/Slack.app"
dockutil --add "/Applications/Spark.app"
dockutil --add "/Applications/Cron.app"
dockutil --add "/Applications/Notion.app"
dockutil --add "/Applications/Obsidian.app"
dockutil --add "/Applications/Numi.app"
dockutil --add "/Applications/Visual Studio Code - Insiders.app"
dockutil --add "/Applications/iTerm.app"
dockutil --add "/System/Applications/Utilities/Activity Monitor.app"
dockutil --add "/System/Applications/System Preferences.app"

killall Dock
