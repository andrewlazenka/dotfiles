#!/usr/bin/env bash

curl -sSL https://raw.githubusercontent.com/rvm/rvm/master/binscripts/rvm-installer | bash -s stable

rvm install ruby-2.7.7

rvm use ruby-2.7.7 --default
