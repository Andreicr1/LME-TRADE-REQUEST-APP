module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  globals: {
    calendarUtils: 'readonly',
    alert: 'readonly',
    fetch: 'readonly',
    caches: 'readonly',
    self: 'readonly',
  },
  rules: {
    'no-unused-vars': 'off',
  },
};
