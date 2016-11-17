#!/bin/bash

BUILD_DIR=$(dirname $0)/../build
EXEC_NAME=$(basename $0)

set -e  # Exit if any step returns an error code.

if [ -z "$1" ] || [ ! -d "$1" ]; then
  echo "usage: $EXEC_NAME <dest_visualizer_dir>"
  echo "Builds the visualizer and copies it to the Ohm git repository"
  exit 1
fi

npm run build

pushd "$BUILD_DIR"
mkdir -p visualizer/assets
cp visualizer-bundle.js visualizer/assets
cp *.worker.js visualizer/assets
cp ../src/index.html visualizer
cp -r ../src/style visualizer
cp -r ../src/third_party visualizer

read -p "Copy visualizer to $1 (y/n)? " -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
  popd
  cp -rv "${BUILD_DIR}/visualizer/" "$1"
fi

# Missing step: symlink ohm.min.js.
