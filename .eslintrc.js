'use strict';

module.exports = {
  parserOptions: {
    sourceType: 'script',
  },

  // To minimize dependencies on Node- or browser-specific features, leave the
  // env empty, and instead define globals as needed.
  env: {
    es2017: true,
  },
  extends: ['google', 'plugin:vue/essential'],

  // Project-wide globals. If other globals are necessary, prefer putting them
  // in a comment at the top of the file rather than adding them here.
  globals: {
    console: true,
    exports: true,
    module: true,
    require: true,
  },
  plugins: ['camelcase-ohm', 'html', 'node', 'no-extension-in-require', 'tape'],
  settings: {
    'html/indent': '+2', // indentation is the <script> indentation plus two spaces.
    'html/report-bad-indent': 2,
  },
  rules: {
    // Enforce "one true brace style", allowing start and end braces to be on the same line.
    'brace-style': ['error', '1tbs', {allowSingleLine: true}],

    // Turn off the regular camelcase rule, and use a custom rule which
    // allows semantic actions to be named like `RuleName_caseName`.
    'camelcase': 0,
    'camelcase-ohm/camelcase-ohm': 2,

    'consistent-this': 0,
    'default-case': 0,

    // Allow use of `==` and `!=` only with null.
    'eqeqeq': ['error', 'allow-null'],

    'guard-for-in': 0,

    'max-len': ['error', {code: 100, ignoreUrls: true}],
    'max-nested-callbacks': 0,
    'max-statements-per-line': ['error', {max: 2}],

    // Don't require `new` when calling functions whose name starts with a capital letter.
    'new-cap': ['error', {capIsNew: false}],

    'no-constant-condition': 0, // Allow things like `while(true)`.
    'no-else-return': 0, // Allow `else` after a return statement.
    'no-eq-null': 0,

    // Don't allow require() statements to include the '.js' extension.
    'no-extension-in-require/main': 2,

    'no-implicit-coercion': 0,
    'no-negated-condition': 0,
    'no-nested-ternary': 0,

    'tape/no-only-test': 2,

    // Allow unused parameters, but not unused variables.
    'no-unused-vars': ['error', {vars: 'all', args: 'none'}],

    'no-warning-comments': ['error', {terms: ['xxx', 'fixme']}],

    'object-shorthand': ['error', 'always'],
    'operator-linebreak': [
      'error',
      'after',
      {overrides: {':': 'ignore', '?': 'ignore'}},
    ],
    'padded-blocks': 0,
    'quotes': ['error', 'single', 'avoid-escape'],
    'radix': 0,
    'require-jsdoc': 0,

    'strict': ['error', 'global'],

    // We would use `["error", "never", {exceptRange: true}]` here, but it doesn't seem to work.
    'yoda': 0,
  },
};
