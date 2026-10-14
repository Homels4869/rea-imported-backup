#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-}"
case "$MODE" in claude|codex|both) ;; *) echo "Uso: $0 {claude|codex|both}" >&2; exit 2;; esac
install_to() {
  local kind="$1" dest="$2" src="$ROOT/skills"
  mkdir -p "$dest"
  for skill in "$src"/*; do
    [[ -d "$skill" ]] || continue
    local name target backup
    name="$(basename "$skill")"
    target="$dest/$name"
    if [[ -e "$target" ]]; then
      backup="$dest/.${name}.backup-$(date +%Y%m%d-%H%M%S)"
      mv -- "$target" "$backup"
      printf 'Backup %s: %s\n' "$kind" "$backup"
    fi
    cp -R -- "$skill" "$target"
    printf 'Instalada %s: %s\n' "$kind" "$target"
  done
}
if [[ "$MODE" == claude || "$MODE" == both ]]; then
  install_to Claude "${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
fi
if [[ "$MODE" == codex || "$MODE" == both ]]; then
  install_to Codex "${CODEX_SKILLS_DIR:-$HOME/.agents/skills}"
fi
