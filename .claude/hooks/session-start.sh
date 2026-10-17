#!/bin/bash
# SessionStart (Claude Code on the web) — installe les dépendances du dépôt.
#
# - Mode async : la session démarre sans attendre. Fin signalée par
#   /tmp/session-start.status (`running` → `ok` | `failed: <cibles>`) ; avant de lancer
#   build/tests juste après l'ouverture d'une session, vérifier que ce fichier vaut `ok`.
# - Cibles installées en parallèle ; une cible déjà à jour (repère plus récent que ses
#   manifestes) est sautée. `install` plutôt que `ci` : l'état du conteneur est mis en
#   cache après le hook, `ci` effacerait node_modules.
# - Une cible en échec n'interrompt pas les autres ; log par cible dans
#   /tmp/session-start-<cible>.log, exit 1 si au moins un échec.
set -uo pipefail

# Only run in remote (Claude Code on the web) environments.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 300000}'

STATUS=/tmp/session-start.status
echo running >"$STATUS"

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || { echo "failed: cd" >"$STATUS"; exit 1; }

# Cibles « gestionnaire:dossier ».
TARGETS=(
  "npm:web"
  "uv:backend"
)

# Vrai si $1 existe et est plus récent que tous les fichiers suivants présents.
is_fresh() {
  local stamp=$1 src
  shift
  [ -e "$stamp" ] || return 1
  for src in "$@"; do
    [ -e "$src" ] && [ "$src" -nt "$stamp" ] && return 1
  done
  return 0
}

install_target() {
  local kind=$1 dir=$2
  case "$kind" in
    npm)
      is_fresh "$dir/node_modules/.package-lock.json" "$dir/package.json" "$dir/package-lock.json" &&
        { echo "==> $dir (npm) : à jour"; return 0; }
      echo "==> $dir (npm) : install"
      (cd "$dir" && npm install --prefer-offline --no-audit --no-fund --loglevel=error)
      ;;
    pnpm)
      is_fresh "$dir/node_modules/.modules.yaml" "$dir/package.json" "$dir/pnpm-lock.yaml" &&
        { echo "==> $dir (pnpm) : à jour"; return 0; }
      echo "==> $dir (pnpm) : install"
      (cd "$dir" && pnpm install --prefer-offline --reporter=silent)
      ;;
    bun)
      is_fresh "$dir/node_modules/.bun-installed" "$dir/package.json" "$dir/bun.lock" &&
        { echo "==> $dir (bun) : à jour"; return 0; }
      echo "==> $dir (bun) : install"
      (cd "$dir" && bun install --silent) && touch "$dir/node_modules/.bun-installed"
      ;;
    uv)
      local reqs=()
      for f in "$dir"/requirements*.txt; do [ -f "$f" ] && reqs+=("$f"); done
      is_fresh "$dir/.venv/.deps-installed" "${reqs[@]}" &&
        { echo "==> $dir (uv) : à jour"; return 0; }
      echo "==> $dir (uv) : venv + install"
      (
        cd "$dir" || exit 1
        [ -d ".venv" ] || uv venv --python 3.11 .venv
        local args=()
        for f in requirements*.txt; do args+=(-r "$f"); done
        uv pip install --python .venv/bin/python "${args[@]}"
      ) && touch "$dir/.venv/.deps-installed"
      ;;
    *) echo "type inconnu : $kind"; return 1 ;;
  esac
}

declare -A PIDS=()
log_of() { local n=${1//\//-}; echo "/tmp/session-start-${n//./root}.log"; }

for target in "${TARGETS[@]}"; do
  kind=${target%%:*} dir=${target#*:}
  [ -d "$dir" ] || continue
  install_target "$kind" "$dir" >"$(log_of "$dir")" 2>&1 &
  PIDS[$dir]=$!
done

FAILED=()
for dir in "${!PIDS[@]}"; do
  if wait "${PIDS[$dir]}"; then
    head -n 1 "$(log_of "$dir")"
  else
    FAILED+=("$dir")
    echo "!! $dir : échec, voir $(log_of "$dir")"
    tail -n 20 "$(log_of "$dir")"
  fi
done

if [ "${#FAILED[@]}" -gt 0 ]; then
  echo "failed: ${FAILED[*]}" >"$STATUS"
  echo "Échec d'installation : ${FAILED[*]}" >&2
  exit 1
fi
echo ok >"$STATUS"
