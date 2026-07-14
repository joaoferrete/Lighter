import js from '@eslint/js';
import globals from 'globals';

// Style rules follow GNOME Shell conventions:
// https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/lint/
export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.es2021,
                // GJS globals
                ARGV: 'readonly',
                imports: 'readonly',
                console: 'readonly',
                log: 'readonly',
                logError: 'readonly',
                print: 'readonly',
                printerr: 'readonly',
                TextDecoder: 'readonly',
                TextEncoder: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                // GNOME Shell global context object
                global: 'readonly',
            },
        },
        rules: {
            'camelcase': ['error', {properties: 'never', allow: ['^vfunc_', '^on_']}],
            'comma-dangle': ['error', 'always-multiline'],
            'eqeqeq': 'error',
            'indent': ['error', 4, {SwitchCase: 1}],
            'no-unused-vars': ['error', {varsIgnorePattern: '^_', argsIgnorePattern: '^_'}],
            'no-var': 'error',
            'prefer-const': 'error',
            'quotes': ['error', 'single', {avoidEscape: true}],
            'semi': ['error', 'always'],
        },
    },
    {
        ignores: ['dist/', 'node_modules/'],
    },
];
