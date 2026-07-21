#!/usr/bin/env sh
set -eu

static_check_files() {
  for path in "$@"; do
    case "$path" in
      node_modules/* | ./node_modules/*)
        ;;
      *)
        printf '%s\0' "$path"
        ;;
    esac
  done
}

lintable_files() {
  for path in "$@"; do
    case "$path" in
      node_modules/* | ./node_modules/*)
        ;;
      *.js | *.cjs | *.mjs | *.ts | *.cts | *.mts | *.vue)
        printf '%s\0' "$path"
        ;;
    esac
  done
}

if [ "${1-}" = "--" ]; then
  shift
fi

# Normalize pnpm's argument separator so the nested format call receives only real file paths.
if [ "$#" -eq 0 ]; then
  # Keep the no-argument workflow aligned with the old command while adding formatting first.
  pnpm run format
  exec eslint --fix . --ignore-pattern=node_modules/**
fi

# Reuse the shared formatter entry point so hooks and manual runs fix files in the same order.
static_check_files "$@" | xargs -0 --no-run-if-empty pnpm run format --

# Skip non-ESLint file types here so the combined command can safely accept mixed file lists.
lintable_files "$@" | xargs -0 --no-run-if-empty eslint --fix --
