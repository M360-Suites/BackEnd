module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended'
    ],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/explicit-function-return-type': 'error'
    }
  }