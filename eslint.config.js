import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  { ignores: ['dist', 'coverage'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.flat.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,
      'react/prop-types': 'off',
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      // ობიექტიდან ველის „ამოგდება“ rest-ით (`const { body, ...summary } = article`)
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
      // useContent / useLoadMore-ის deps იგივე წესით მოწმდება, რაც useEffect-ის
      'react-hooks/exhaustive-deps': ['error', { additionalHooks: '^(useContent|useLoadMore)$' }],
    },
  },
  {
    files: ['*.config.js', 'scripts/**/*.{js,mjs}', 'src/**/*.test.{js,jsx}', 'src/test/**'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { sourceType: 'module', globals: globals.node },
  },
  prettier,
];
