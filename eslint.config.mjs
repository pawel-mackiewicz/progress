import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import storybook from 'eslint-plugin-storybook'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'storybook-static/**',
      'dev-dist/**',
      '**/.temp/**',
      '.wrangler/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  ...storybook.configs['flat/recommended'],
  {
    files: ['**/*.{js,cjs,mjs,ts,cts,mts,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2023,
        __APP_VERSION__: 'readonly'
      }
    }
  },
  {
    files: [
      '*.config.{js,cjs,mjs,ts,cts,mts}',
      'scripts/**/*.{js,cjs,mjs}',
      '.storybook/**/*.{js,cjs,mjs,ts,cts,mts}',
      'playwright.config.ts'
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2023
      }
    }
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser
      }
    }
  },
  {
    files: ['**/*.spec.ts', 'vitest.setup.ts'],
    languageOptions: {
      globals: {
        ...globals.vitest
      }
    }
  },
  prettier
)
