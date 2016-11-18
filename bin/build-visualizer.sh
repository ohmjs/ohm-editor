#!/bin/bash

DIR_NAME=$(dirname "$0")
EXEC_NAME=$(basename "$0")
BUILD_DIR=$(dirname "$DIR_NAME")/build

set -e  # Exit if any step returns an error code.

if [ -z "$1" ] || [ ! -d "$1" ]; then
  echo "usage: $EXEC_NAME <dest_visualizer_dir>"
  echo "Builds the visualizer and copies it to the Ohm git repository"
  exit 1
fi

npm run build

pushd "$BUILD_DIR"

# Ensure there is a clean 'visualizer' directory under $BUILD_DIR.
mkdir -p visualizer
rm -rf visualizer/*
mkdir -p visualizer/assets
echo "Ohm editor version: $(git rev-parse HEAD)" > visualizer/build-info.txt

# Copy the appropriate files into the $BUILD_DIR/visualizer.
cp visualizer-bundle.js visualizer/assets
cp *.worker.js visualizer/assets
cp -r ../src/index.html ../src/style ../src/third_party visualizer

# Sync $BUILD_DIR/visualizer with the user-specified destination dir.
read -p "Copy visualizer to $1 (y/n)? " -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]
then
  popd
  rsync -av --delete "${BUILD_DIR}/visualizer" $(dirname "$1")
fi
