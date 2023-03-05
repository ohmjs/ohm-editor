# Ohm Editor

[![Build Status](https://github.com/ohmjs/ohm-editor/actions/workflows/node.js.yml/badge.svg)](https://github.com/ohmjs/ohm-editor/actions/workflows/node.js.yml)
[![Live demo](https://img.shields.io/badge/Live%20demo-%E2%86%92-9D6EB3.svg)](https://ohmlang.github.io/editor/)

A standalone editor for the [Ohm](https://github.com/cdglabs/ohm) language.

## Usage

Clone this repository and run `npm install` in the project root.

To run the editor in the browser:

    npm start

## Development Notes

- To deploy from your local repository to https://ohmlang.github.io/editor/, use `bin/deploy-gh-pages.sh`. When the script shows the following prompt:

        Do you want to deploy to ohmlang.github.io (y/n)?

  ...you can test things locally by switching to your clone of ohmlang.github.io and running the following command in the repository root:

        python -c "import SimpleHTTPServer; m = SimpleHTTPServer.SimpleHTTPRequestHandler.extensions_map; m[''] = 'text/plain'; m.update(dict([(k, v + ';charset=UTF-8') for k, v in m.items()])); SimpleHTTPServer.test();"

  This will serve the contents of the ohmlang.github.io site locally.
