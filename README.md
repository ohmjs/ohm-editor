# Ohm Editor

[![Build Status](https://img.shields.io/travis/harc/ohm.svg?style=flat-square)](https://travis-ci.org/harc/ohm-editor)
[![Live demo](https://img.shields.io/badge/Live%20demo-%E2%86%92-9D6EB3.svg?style=flat-square)](https://ohmlang.github.io/editor/)

A standalone editor for the [Ohm](https://github.com/cdglabs/ohm) language.

## Usage

Clone this repository and run `npm install` in the project root.

To run the editor in the browser:

    npm start

To run the editor as a standalone app (using Electron):

    npm run electron

## Development Notes

- To deploy from your local repository to https://ohmlang.github.io/editor/, use `bin/deploy-gh-pages.sh`. When the script shows the following prompt:

        Do you want to deploy to ohmlang.github.io (y/n)?

  ...you can test things locally by switching to your clone of ohmlang.github.io and running the following command in the repository root:

        python -c "import SimpleHTTPServer; m = SimpleHTTPServer.SimpleHTTPRequestHandler.extensions_map; m[''] = 'text/plain'; m.update(dict([(k, v + ';charset=UTF-8') for k, v in m.items()])); SimpleHTTPServer.test();"

  This will serve the contents of the ohmlang.github.io site locally.

- This package depends on a specific version of Ohm from the GitHub repo, which is specified by including a commit hash as part of the dependency in package.json, e.g.:

          "dependencies": {
            "electron-prebuilt": "^1.1.0",
            "ohm-js": "git://github.com/harc/ohm.git#537ff61"
          }

  - To bump the version of Ohm, just replace the commit hash (`#537ff61`) with whatever version you want to depend on.

  - To depend on the contents of your local Ohm repository, just replace `node_modules/ohm-js` in your ohm-editor repo with a symlink to your copy of the Ohm repo. E.g.:

          $ cd node_modules
          $ mv ohm-js ohm-js.orig
          $ ln -s ../../ohm ohm-js

    ...then run `npm install` in the root of your ohm-editor repo.
