module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json', 'tsconfig.dev.json'],
    sourceType: 'module',
  },
  ignorePatterns: [
    '/lib/**/*', // Ignore built files.
  ],
  plugins: [
    '@typescript-eslint',
    'import',
  ],
  rules: {
    'space-before-function-paren': ['warn', 'never'],
    'semi': ['warn', 'always'],
    'prefer-promise-reject-errors': 0,
    'spaceInfixOps': 0,
    'max-len': ['error', {'code': 150}],
    'indent': ['error', 2],
    'no-control-regex': 0,
  },
};
