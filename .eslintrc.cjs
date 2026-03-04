/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Possible Errors
    'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
    'no-debugger': 'warn',
    'no-duplicate-imports': 'error',

    // Best Practices
    'curly': ['error', 'all'],
    'default-case': 'warn',
    'dot-notation': 'error',
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'no-else-return': 'error',
    'no-empty-function': 'warn',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-multi-spaces': 'error',
    'no-new-wrappers': 'error',
    'no-return-await': 'error',
    'no-self-compare': 'error',
    'no-throw-literal': 'error',
    'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    'prefer-promise-reject-errors': 'error',
    'require-await': 'warn',
    'yoda': 'error',

    // Variables
    'no-shadow': 'warn',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-use-before-define': ['error', { functions: false, classes: true }],

    // ES6+
    'arrow-body-style': ['error', 'as-needed'],
    'no-var': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-const': 'error',
    'prefer-destructuring': ['warn', { object: true, array: false }],
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
    'prefer-template': 'error',

    // Style (formatting handled by Prettier)
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],

    // Security
    'no-new-func': 'error'
  },
  overrides: [
    {
      // Server-side Node.js files
      files: ['server/**/*.js'],
      env: {
        node: true,
        browser: false
      },
      rules: {
        'no-console': 'off' // Allow console in server code
      }
    },
    {
      // Test files
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true,
        mocha: true
      }
    },
    {
      // Config files
      files: ['*.config.js', '*.config.cjs', '.eslintrc.cjs'],
      env: {
        node: true
      }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '*.min.js',
    'vendor/'
  ]
};
