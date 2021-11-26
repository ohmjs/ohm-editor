#!/bin/bash

DIR_NAME=$(dirname "$0")
EXEC_NAME=$(basename "$0")
BUILD_DIR=$(dirname "$DIR_NAME")/build

set -e  # Exit if any step returns an error code.

if [ -z "$1" ] || [ ! -d "$1" ]; then
  echo "usage: $EXEC_NAME <dest_visualizer_dir>"
  echo "Builds the Ohm Editor for distribution and copies it to a given directory"
  exit 1
fi

npm run build

pushd "$BUILD_DIR"
echo "Ohm editor version: $(git rev-parse HEAD)" > build-info.txt

# Sync $BUILD_DIR with the assets/ subdirectory of the destination dir.
read -p "Copy editor to $1 (y/n)? " -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
  popd
  rsync -av --delete public/ "$1"
  rsync -av --delete "${BUILD_DIR}/" "$1/assets"
fi
