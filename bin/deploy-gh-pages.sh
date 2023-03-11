#!/bin/bash

# To run this, you need a checkout of https://github.com/ohmjs/ohmjs.org.

# Accepts an optional argument, which is the path to the ohmjs.org repository root.
# If not specified, it looks for a directory named ohmjs.org in the same directory
# as this repository.

set -e

ROOT=$(npm prefix)
OHM_REV=$(git rev-parse --short main)

PAGES_DIR="$1"
if [ -z "$1" ]; then
  PAGES_DIR="$ROOT/../ohmjs.org"  # Default if $1 is empty
fi

# Now check that the $PAGES_DIR exists.
if [ ! -d "$PAGES_DIR" ]; then
  echo "No such directory: $PAGES_DIR" && exit 1
fi

# Do a build and copy everything to $PAGES_DIR/static/editor
"$ROOT/bin/build-visualizer.sh" "$PAGES_DIR/static/editor"

# Double check that $PAGES_DIR is actually a git repo.
pushd "$PAGES_DIR"
if ! git rev-parse --quiet --verify main > /dev/null; then
  echo "Not a git repository: $PAGES_DIR" && exit 1
fi

read -p "Do you want to commit to ohmjs.org (y/n)? " -n 1 -r

# Engage!
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git pull --ff-only --no-stat
  git add static/editor
  git commit -m "Update from ohmjs/ohm-editor@${OHM_REV}"
  git push origin main
fi
