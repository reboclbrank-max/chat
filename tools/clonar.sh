#!/usr/bin/env bash
# Clona (ou atualiza) o repositório do chat neste workspace, do zero, sem passo manual.
#
# POR QUE EXISTE (31/10/2026): o workspace foi limpo — os clones antigos ocupavam 446 MB e
# todos eram reconstruíveis a partir do GitHub. Este script é o único caminho necessário
# para voltar a trabalhar: ele clona, instala as dependências que a barreira exige e
# confere que o HEAD é o commit publicado.
#
# Uso:  bash tools/clonar.sh            # clona em ./chat
#       bash tools/clonar.sh /tmp/cl    # clona/atualiza em outro caminho
set -euo pipefail

DESTINO="${1:-$PWD/chat}"
TOK="$(cat "$(dirname "$0")/.token-github" 2>/dev/null || echo "${HOME}/tools/.token-github")"
REPO="reboclbrank-max/chat"

if [ -z "${TOK:-}" ]; then
  echo "sem token em tools/.token-github — não dá para clonar" >&2
  exit 1
fi

if [ -d "$DESTINO/.git" ]; then
  echo "→ atualizando $DESTINO"
  git -C "$DESTINO" fetch -q "https://x-access-token:$TOK@github.com/$REPO.git" +refs/heads/main:refs/remotes/origin/main
  git -C "$DESTINO" -c user.name="Rebocl Agent" -c user.email="agent@users.noreply.github.com" \
      reset -q --hard origin/main
else
  echo "→ clonando $REPO em $DESTINO"
  git clone -q "https://x-access-token:$TOK@github.com/$REPO.git" "$DESTINO"
fi

cd "$DESTINO"
git config user.name "Rebocl Agent"
git config user.email "agent@users.noreply.github.com"

# a barreira tem teste que importa imapflow; sem isto ele falha por pré-requisito, não por defeito
[ -d node_modules ] || npm install --no-audit --no-fund --silent

echo "HEAD: $(git rev-parse --short HEAD) — $(git log -1 --format=%s)"
echo "casca: $(grep -o 'rebocl-chat-v[0-9]*' sw.js | head -1)"
