import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'coverage'],
  },
  {
    files: ['**/*.{ts,vue}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Unused args/vars prefixed with "_" are intentional (e.g. v-model handlers, placeholder params).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      // Existing `any` usages (~60) are not rewritten in the one-time baseline; new code should avoid them.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      // Legacy single-word components (Captcha, Breadcrumb, Sidebar) are kept; new components must be multi-word.
      'vue/multi-word-component-names': ['error', { ignores: ['Captcha', 'Breadcrumb', 'Sidebar'] }],
    },
  },
  {
    // shadcn-vue generated primitives keep their upstream names.
    files: ['src/components/ui/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
)
