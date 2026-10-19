#!/usr/bin/env bash
# Exercita, em Chromium headless real, a lista paginada da interface.
# A cópia da página e a API existem apenas em /tmp: não usa PAT, conversa,
# conta, rede externa ou perfil persistente.
set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$raiz"

if [ -n "${CHROMIUM_BIN:-}" ]; then
  navegador="$CHROMIUM_BIN"
elif command -v chromium-headless-shell >/dev/null 2>&1; then
  navegador="$(command -v chromium-headless-shell)"
elif command -v chromium >/dev/null 2>&1; then
  navegador="$(command -v chromium)"
elif command -v chromium-browser >/dev/null 2>&1; then
  navegador="$(command -v chromium-browser)"
elif command -v google-chrome >/dev/null 2>&1; then
  navegador="$(command -v google-chrome)"
else
  echo "SKIP: Chromium não está instalado. Em Debian/Ubuntu, use: sudo apt-get update -qq && sudo apt-get install -y -qq chromium-headless-shell" >&2
  exit 2
fi

for cmd in node python3 timeout; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "ERRO: falta $cmd" >&2; exit 2; }
done

porta="$(python3 - <<'PY'
import socket
s = socket.socket()
s.bind(('127.0.0.1', 0))
print(s.getsockname()[1])
s.close()
PY
)"
trabalho="$(mktemp -d /tmp/chat-browser-lista.XXXXXX)"
servidor_pid=""
limpar() {
  if [ -n "$servidor_pid" ] && kill -0 "$servidor_pid" 2>/dev/null; then
    kill "$servidor_pid" 2>/dev/null || true
    wait "$servidor_pid" 2>/dev/null || true
  fi
  rm -rf "$trabalho"
}
trap limpar EXIT

rotas=(index.html direto.html ligar.html limpar.html)
for rota in "${rotas[@]}"; do
  cp "$rota" "$trabalho/$rota"
done
python3 - "$trabalho" "${rotas[@]}" <<'PY'
from pathlib import Path
import sys

pasta = Path(sys.argv[1])
paginas = [pasta / nome for nome in sys.argv[2:]]
preparo = """<script>
/* Fixture controlada: valor inerte, sem PAT, conversa ou API real. */
localStorage.setItem('assistente_rebocl_token', 'controle-local-sem-segredo');
try {
  if ('serviceWorker' in navigator) {
    const esperaControlada = { postMessage: (dado) => { document.documentElement.dataset.pwaUpdateRequest = String((dado || {}).tipo || ''); } };
    navigator.serviceWorker.register = () => Promise.resolve({ waiting: esperaControlada, installing: null, addEventListener: () => {}, update: () => {} });
  }
} catch (e) {}
</script>"""
teste_lista = """<script>
(async () => {
  const esperar = async (predicado, limite = 5000) => {
    const fim = Date.now() + limite;
    while (Date.now() < fim) {
      if (predicado()) return;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw new Error('tempo esgotado na fixture');
  };
  const visivel = (elemento) => !!elemento && getComputedStyle(elemento).display !== 'none';
  try {
    await esperar(() => document.querySelectorAll('#lista .conv').length >= 52);
    const busca = document.getElementById('busca');
    busca.value = 'agulha pesquisável';
    busca.dispatchEvent(new Event('input', { bubbles: true }));
    aplicarFiltroLista();

    const primeiroMais = document.getElementById('card-mais');
    const nova = document.getElementById('card-nova');
    if (!visivel(primeiroMais)) throw new Error('carregar mais ficou oculto na busca');
    if (visivel(nova)) throw new Error('nova conversa ficou visível na busca');

    primeiroMais.click();
    await esperar(() => document.querySelectorAll('#lista .conv').length >= 101);
    const segundoMais = document.getElementById('card-mais');
    if (!visivel(segundoMais)) throw new Error('segundo carregar mais ficou oculto na busca');

    segundoMais.click();
    await esperar(() => document.querySelector('#lista').textContent.includes('Agulha pesquisável'));
    const alvo = [...document.querySelectorAll('#lista .conv')]
      .find(elemento => elemento.textContent.includes('Agulha pesquisável'));
    if (!visivel(alvo)) throw new Error('resultado da página 3 não ficou visível');

    const avisoPwa = document.getElementById('aviso-atualizacao');
    const botaoPwa = document.getElementById('btn-aplicar-atualizacao');
    const entrada = document.getElementById('entrada');
    if (!visivel(avisoPwa) || !botaoPwa) throw new Error('aviso de atualização controlada ausente');
    entrada.value = 'rascunho de fixture';
    entrada.dispatchEvent(new Event('input', { bubbles: true }));
    if (!botaoPwa.disabled) throw new Error('atualização aceitou recarregar com rascunho');
    entrada.value = '';
    entrada.dispatchEvent(new Event('input', { bubbles: true }));
    if (botaoPwa.disabled) throw new Error('atualização ficou bloqueada sem escrita ou rascunho');
    botaoPwa.click();
    if (document.documentElement.dataset.pwaUpdateRequest !== 'REBOCL_ATIVAR_ATUALIZACAO') throw new Error('atualização explícita não pediu ativação ao worker controlado');

    document.body.dataset.browserE2e = 'PASS: busca ativa manteve carregar mais; nova conversa oculta; alvo da página 3 visível; PWA protegeu rascunho e só ativou por escolha';
  } catch (erro) {
    document.body.dataset.browserE2e = 'FAIL: ' + String((erro && erro.message) || erro).slice(0, 180);
  }
})();
</script>"""
teste_limpar = """<script>
try {
  const texto = document.body.textContent || '';
  if (new URL(location.href).searchParams.has('t')) throw new Error('parâmetro t permaneceu na URL');
  if (!texto.includes('Cache limpo.')) throw new Error('aviso de limpeza não apareceu');
  if (!texto.includes('Tokens nunca são aceitos por link.')) throw new Error('guarda de token por link não apareceu');
  document.body.dataset.browserE2e = 'PASS: rota limpar removeu t da URL e mostrou a guarda de token';
} catch (erro) {
  document.body.dataset.browserE2e = 'FAIL: ' + String((erro && erro.message) || erro).slice(0, 180);
}
</script>"""

# A única alteração em cada cópia temporária redireciona a API para o servidor local.
for pagina in paginas:
    conteudo = pagina.read_text()
    assert "const API = 'https://api.github.com';" in conteudo, pagina
    conteudo = conteudo.replace("const API = 'https://api.github.com';", "const API = location.origin;", 1)
    conteudo = conteudo.replace('<head>', '<head>' + preparo, 1)
    teste = teste_limpar if pagina.name == 'limpar.html' else teste_lista
    conteudo = conteudo.replace('</body>', teste + '</body>', 1)
    pagina.write_text(conteudo)
PY

cat > "$trabalho/servidor.js" <<'NODE'
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const raiz = process.env.FIXTURE_ROOT;
const porta = Number(process.env.FIXTURE_PORT);
const issue = (number, title) => ({
  number, title, comments: 0, labels: [], updated_at: '2026-10-18T00:00:00Z'
});
const pagina = (numero) => {
  if (numero === 1) return Array.from({ length: 50 }, (_, i) => issue(i + 1, `Página um ${i + 1}`));
  if (numero === 2) {
    return [issue(1, 'Duplicada deslocada')]
      .concat(Array.from({ length: 49 }, (_, i) => issue(i + 51, `Página dois ${i + 51}`)));
  }
  if (numero === 3) return [issue(100, 'Agulha pesquisável')];
  return [];
};
const responderJson = (resposta, dado) => {
  resposta.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  resposta.end(JSON.stringify(dado));
};
http.createServer((requisicao, resposta) => {
  const url = new URL(requisicao.url, `http://127.0.0.1:${porta}`);
  if (url.pathname === '/user') return responderJson(resposta, { login: 'fixture-controlada' });
  if (url.pathname === '/repos/reboclbrank-max/agente') return responderJson(resposta, { full_name: 'fixture/controlada' });
  if (url.pathname === '/repos/reboclbrank-max/agente/issues') {
    return responderJson(resposta, pagina(Number(url.searchParams.get('page') || 1)));
  }
  const arquivo = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  if (new Set(['index.html', 'direto.html', 'ligar.html', 'limpar.html']).has(arquivo)) {
    resposta.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    return fs.createReadStream(path.join(raiz, arquivo)).pipe(resposta);
  }
  resposta.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  resposta.end('fixture sem recurso externo');
}).listen(porta, '127.0.0.1', () => console.log(`fixture pronta ${porta}`));
NODE

FIXTURE_ROOT="$trabalho" FIXTURE_PORT="$porta" node "$trabalho/servidor.js" >"$trabalho/servidor.log" 2>&1 &
servidor_pid=$!
for _ in $(seq 1 30); do
  grep -q 'fixture pronta' "$trabalho/servidor.log" && break
  sleep 0.1
done
grep -q 'fixture pronta' "$trabalho/servidor.log" || { cat "$trabalho/servidor.log" >&2; exit 1; }

for rota in "${rotas[@]}"; do
  nome="${rota%.html}"
  dom="$trabalho/dom-$nome.html"
  orcamento=12000
  url="http://127.0.0.1:$porta/$rota"
  if [ "$rota" = 'limpar.html' ]; then
    # A rota intencionalmente redireciona após 3 s; observamos sua guarda antes disso.
    orcamento=2000
    url="$url?t=controle-ficticio"
  fi
  timeout 60 "$navegador" \
    --headless --no-sandbox --disable-gpu --no-first-run --disable-background-networking --disable-sync \
    --host-resolver-rules='MAP * 0.0.0.0, EXCLUDE 127.0.0.1' \
    --user-data-dir="$trabalho/perfil-$nome" --virtual-time-budget="$orcamento" --dump-dom \
    "$url" > "$dom" 2>"$trabalho/navegador-$nome.err"

  python3 - "$dom" "$rota" <<'PY'
from pathlib import Path
import html
import re
import sys

conteudo = Path(sys.argv[1]).read_text()
rota = sys.argv[2]
resultado = re.search(r'data-browser-e2e="([^"]*)"', conteudo)
assert resultado, f'{rota}: resultado do navegador ausente'
texto = html.unescape(resultado.group(1))
assert texto.startswith('PASS:'), f'{rota}: {texto}'
if rota != 'limpar.html':
    assert 'Agulha pesquisável' in conteudo, f'{rota}: cartão alvo não está no DOM final'
else:
    assert 'Cache limpo.' in conteudo, f'{rota}: aviso de limpeza não está no DOM final'
print('✔ navegador controlado · ' + rota + ' · ' + texto)
PY
done
