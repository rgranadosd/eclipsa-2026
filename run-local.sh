#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-5500}"
URL="http://localhost:${PORT}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 no esta instalado en tu sistema."
  echo "Instalalo y vuelve a ejecutar este script."
  exit 1
fi

cd "$ROOT_DIR"

echo "Iniciando servidor local en ${URL}"
echo "Pulsa Ctrl+C para detenerlo."

python3 -m http.server "$PORT" &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

for _ in {1..50}; do
  if curl -fsS "$URL" >/dev/null 2>&1; then
    break
  fi

  sleep 0.1
done

if command -v open >/dev/null 2>&1; then
  open "$URL" >/dev/null 2>&1 || true
fi

wait "$SERVER_PID"
