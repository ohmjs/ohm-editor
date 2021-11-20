'use strict';

module.exports = {
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'script',
  },
  overrides: [
    {
      files: ['src/**/*.vue'],
      parserOptions: {
        sourceType: 'module',
      },
    },
  ],

  // To minimize dependencies on Node- or browser-specific features, leave the
  // env empty, and instead define globals as needed.
  env: {},
  extends: ['eslint:recommended', 'google', 'plugin:vue/essential', 'prettier'],

  // Project-wide globals. If other globals are necessary, prefer putting them
  // in a comment at the top of the file rather than adding them here.
  globals: {
    console: true,
    exports: true,
    module: true,
    require: true,
  },
  plugins: ['camelcase-ohm', 'html', 'node', 'no-extension-in-require', 'tape'],
  settings: {},
  rules: {
    // ----- Custom settings for this project -----

    // Turn off the regular camelcase rule, and use a custom rule which
    // allows semantic actions to be named like `RuleName_caseName`.
    camelcase: 0,
    'camelcase-ohm/camelcase-ohm': 2,

    'max-len': ['error', {code: 100, ignoreUrls: true}],

    'no-console': 2,

    // Don't allow require() statements to include the '.js' extension.
    'no-extension-in-require/main': 2,

    'no-warning-comments': ['error', {terms: ['xxx', 'fixme']}],
    strict: ['error', 'global'],
    'tape/no-only-test': 2,

    // ----- Exceptions to eslint:recommended -----

    // Don't require `new` when calling functions whose name starts with a capital letter.
    'new-cap': ['error', {capIsNew: false}],
    'no-redeclare': 0,
    'require-jsdoc': 0,
  },
};
