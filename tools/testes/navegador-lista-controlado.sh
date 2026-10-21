#!/usr/bin/env bash
# Exercita, em Chromium headless real, a lista, PWA, rascunho e Workspace local.
# A cópia da página, API, perfil, IndexedDB e capturas existem apenas em /tmp:
# não usa PAT, conversa, conta, rede externa ou perfil persistente.
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
# A cópia precisa incluir a casca local que as quatro páginas realmente carregam.
# Sem isso, um erro em um módulo compartilhado poderia interromper a página antes
# da fixture testar a lista e daria uma falsa prova de navegador.
ativos_locais=(chat-estilos.css chat-pwa.js chat-comandos-locais.js chat-filtro-chips.js chat-organizacao-local.js chat-colecoes-local.js chat-workspace.js dna.json)
for rota in "${rotas[@]}"; do
  cp "$rota" "$trabalho/$rota"
done
for ativo in "${ativos_locais[@]}"; do
  cp "$ativo" "$trabalho/$ativo"
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
  // A fixture confirma os diálogos do ciclo local; não há dado real, download ou rede externa.
  window.confirm = () => true;
  if ('serviceWorker' in navigator) {
    const esperaControlada = { postMessage: (dado) => { document.documentElement.dataset.pwaUpdateRequest = String((dado || {}).tipo || ''); } };
    navigator.serviceWorker.register = () => Promise.resolve({ waiting: esperaControlada, installing: null, addEventListener: () => {}, update: () => {} });
  }
} catch (e) {}
</script>"""
teste_lista = """<script>
(async () => {
  const esperar = async (predicado, limite = 5000, etapa = 'etapa sem rótulo') => {
    const fim = Date.now() + limite;
    while (Date.now() < fim) {
      if (predicado()) return;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw new Error('tempo esgotado na fixture: ' + etapa);
  };
  const visivel = (elemento) => !!elemento && getComputedStyle(elemento).display !== 'none';
  const porTexto = (raiz, seletor, texto) => [...raiz.querySelectorAll(seletor)].find((item) => item.textContent.includes(texto));
  const esperarWorkspace = async (predicado, rotulo, tentativas = 20) => {
    for (let tentativa = 0; tentativa < tentativas; tentativa++) {
      if (predicado()) return;
      // O Chromium agenda IndexedDB no relógio virtual. Um salto espaçado dá
      // à transação real a vez de concluir, sem inundá-la com polling de 20 ms.
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
    if (predicado()) return;
    throw new Error('Workspace não concluiu a transação local controlada: ' + (rotulo || 'etapa sem nome'));
  };
  const esperarOrganizacao = async (predicado, rotulo, tentativas = 20) => {
    for (let tentativa = 0; tentativa < tentativas; tentativa++) {
      if (predicado()) return;
      // Favoritos também usam IndexedDB real; respeite o mesmo agendamento
      // virtual sem transformar uma espera de persistência em falso negativo.
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
    if (predicado()) return;
    throw new Error('Favoritos locais não concluíram a transação controlada: ' + (rotulo || 'etapa sem nome'));
  };
  const esperarColecoes = async (predicado, rotulo, tentativas = 20) => {
    for (let tentativa = 0; tentativa < tentativas; tentativa++) {
      if (predicado()) return;
      // Coleções são outro banco IndexedDB local; use a mesma espera espaçada
      // do relógio virtual sem tocar em rede, perfil real ou conversa do dono.
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
    if (predicado()) return;
    throw new Error('Coleções locais não concluíram a transação controlada: ' + (rotulo || 'etapa sem nome'));
  };
  const testarWorkspace = async () => {
    if (!location.pathname.endsWith('/index.html')) return '';
    if (![...document.styleSheets].some((folha) => String(folha.href || '').endsWith('/chat-estilos.css'))) {
      throw new Error('casca CSS local do Workspace não carregou');
    }
    const abrir = document.getElementById('btn-workspace');
    abrir.click();
    await esperar(() => visivel(document.getElementById('tela-workspace')), 5000, 'abrir Workspace');
    const parametros = new URL(location.href).searchParams;
    const viewport = parametros.get('viewport');
    if (viewport) {
      const trilhos = getComputedStyle(document.querySelector('.workspace-corpo')).gridTemplateColumns.trim().split(/\\s+/).filter(Boolean);
      if (viewport === 'desktop' && (matchMedia('(max-width: 900px)').matches || trilhos.length !== 3)) {
        throw new Error('Workspace não preservou o layout de três painéis no viewport desktop');
      }
      if (viewport === 'mobile' && (!matchMedia('(max-width: 900px)').matches || trilhos.length !== 1)) {
        throw new Error('Workspace não empilhou os painéis no viewport estreito');
      }
    }
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-projetos .workspace-projeto', 'Meu workspace'), 'projeto padrão');
    if (parametros.get('somente-layout') === '1') return ' · Workspace abriu com a casca local e o layout ' + viewport + ' controlado';

    const nomeProjeto = 'Projeto de fixture controlada';
    const nomeArquivo = 'nota-fixture.md';
    const conteudoInicial = 'conteúdo sintético da primeira versão';
    const conteudoFinal = 'conteúdo sintético da segunda versão';
    const novoProjeto = document.getElementById('workspace-novo-projeto');
    novoProjeto.value = nomeProjeto;
    document.getElementById('btn-workspace-criar-projeto').click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjeto), 'criar projeto');

    document.getElementById('btn-workspace-novo-arquivo').click();
    const nome = document.getElementById('workspace-nome-arquivo');
    const editor = document.getElementById('workspace-editor');
    await esperarWorkspace(() => !nome.disabled && !editor.disabled, 'criar arquivo');
    nome.value = nomeArquivo;
    nome.dispatchEvent(new Event('input', { bubbles: true }));
    editor.value = conteudoInicial;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btn-workspace-salvar').click();
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('Arquivo salvo localmente'), 'primeiro salvamento');

    editor.value = conteudoFinal;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btn-workspace-salvar').click();
    await esperarWorkspace(() => document.querySelectorAll('#workspace-lista-revisoes .workspace-revisao').length >= 1, 'criar revisão');
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('Arquivo salvo localmente'), 'segundo salvamento');

    document.getElementById('btn-workspace-apagar-arquivo').click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-lixeira .workspace-lixeira-item', nomeArquivo), 'arquivo na lixeira');
    let linha = porTexto(document, '#workspace-lista-lixeira .workspace-lixeira-item', nomeArquivo);
    const restaurarArquivo = porTexto(linha, 'button', 'Restaurar');
    if (!restaurarArquivo) throw new Error('restauração de arquivo não apareceu na lixeira');
    restaurarArquivo.click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-arquivos .workspace-arquivo', nomeArquivo), 'restaurar arquivo');
    await esperarWorkspace(() => editor.value === conteudoFinal, 'conteúdo restaurado');

    document.getElementById('btn-workspace-apagar-projeto').click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-lixeira .workspace-lixeira-item', nomeProjeto), 'projeto na lixeira');
    linha = porTexto(document, '#workspace-lista-lixeira .workspace-lixeira-item', nomeProjeto);
    const restaurarProjeto = porTexto(linha, 'button', 'Restaurar');
    if (!restaurarProjeto) throw new Error('restauração de projeto não apareceu na lixeira');
    restaurarProjeto.click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjeto), 'restaurar projeto');
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-arquivos .workspace-arquivo', nomeArquivo), 'arquivo após restaurar projeto');

    if (!document.getElementById('workspace-status').textContent.toLowerCase().includes('nada foi enviado')) {
      throw new Error('ciclo local não declarou a ausência de envio');
    }
    return ' · Workspace criou, versionou e recuperou arquivo/projeto somente na fixture';
  };
  try {
    await esperar(() => document.querySelectorAll('#lista .conv').length >= 52, 5000, 'lista inicial');
    const estrelaAtual = () => document.querySelector('#lista .conv-conversa[data-conversa-numero="1"] .conv-favorita');
    const filtroFavoritas = document.getElementById('btn-filtrar-favoritas');
    if (!estrelaAtual() || !filtroFavoritas) throw new Error('controles de favoritos locais ausentes');
    // A abertura real do IndexedDB pode rerenderizar os cartões entre estas duas
    // etapas; consulte o controle atual para não clicar em um nó já substituído.
    await esperarOrganizacao(() => {
      const estrela = estrelaAtual();
      return !!estrela && !estrela.disabled && !filtroFavoritas.disabled;
    }, 'favoritos locais prontos');
    estrelaAtual().click();
    await esperarOrganizacao(() => document.querySelector('#lista .conv-conversa[data-conversa-numero="1"] .conv-favorita').getAttribute('aria-pressed') === 'true', 'marcar favorito');
    filtroFavoritas.click();
    await esperar(() => filtroFavoritas.getAttribute('aria-pressed') === 'true', 5000, 'ativar filtro de favoritas');
    const visiveisFavoritas = [...document.querySelectorAll('#lista .conv-conversa')].filter(visivel);
    if (visiveisFavoritas.length !== 1 || !visiveisFavoritas[0].textContent.includes('Página um 1')) {
      throw new Error('filtro local não isolou a conversa favorita');
    }
    if (!visivel(document.getElementById('card-mais'))) throw new Error('carregar mais sumiu no filtro de favoritas');
    filtroFavoritas.click();
    await esperar(() => filtroFavoritas.getAttribute('aria-pressed') === 'false', 5000, 'desativar filtro de favoritas');

    const campoColecao = document.getElementById('nome-nova-colecao');
    const criarColecao = document.getElementById('btn-criar-colecao');
    const seletorColecao = document.getElementById('seletor-colecao');
    const filtroColecao = document.getElementById('btn-filtrar-colecao');
    const botaoColecaoAtual = () => document.querySelector('#lista .conv-conversa[data-conversa-numero="1"] .conv-colecao');
    if (!campoColecao || !criarColecao || !seletorColecao || !filtroColecao || !botaoColecaoAtual()) {
      throw new Error('controles de coleções locais ausentes');
    }
    await esperarColecoes(() => !criarColecao.disabled, 'coleções locais prontas');
    campoColecao.value = 'Coleção de fixture';
    criarColecao.click();
    await esperarColecoes(() => [...seletorColecao.options].some(opcao => opcao.textContent.includes('Coleção de fixture')), 'criar coleção');
    const opcaoColecao = [...seletorColecao.options].find(opcao => opcao.textContent.includes('Coleção de fixture'));
    seletorColecao.value = opcaoColecao.value;
    seletorColecao.dispatchEvent(new Event('change', { bubbles: true }));
    await esperarColecoes(() => {
      const botao = botaoColecaoAtual();
      return !!botao && !botao.disabled;
    }, 'escolher coleção');
    botaoColecaoAtual().click();
    await esperarColecoes(() => document.querySelector('#lista .conv-conversa[data-conversa-numero="1"] .conv-colecao').getAttribute('aria-pressed') === 'true', 'associar conversa');
    filtroColecao.click();
    await esperar(() => filtroColecao.getAttribute('aria-pressed') === 'true', 5000, 'ativar filtro de coleção');
    const visiveisColecao = [...document.querySelectorAll('#lista .conv-conversa')].filter(visivel);
    if (visiveisColecao.length !== 1 || !visiveisColecao[0].textContent.includes('Página um 1')) {
      throw new Error('filtro local não isolou a conversa da coleção');
    }
    if (!visivel(document.getElementById('card-mais'))) throw new Error('carregar mais sumiu no filtro de coleção');
    filtroColecao.click();
    await esperar(() => filtroColecao.getAttribute('aria-pressed') === 'false', 5000, 'desativar filtro de coleção');

    const busca = document.getElementById('busca');
    busca.value = 'agulha pesquisável';
    busca.dispatchEvent(new Event('input', { bubbles: true }));
    aplicarFiltroLista();

    const primeiroMais = document.getElementById('card-mais');
    const nova = document.getElementById('card-nova');
    if (!visivel(primeiroMais)) throw new Error('carregar mais ficou oculto na busca');
    if (visivel(nova)) throw new Error('nova conversa ficou visível na busca');

    primeiroMais.click();
    await esperar(() => document.querySelectorAll('#lista .conv').length >= 101, 5000, 'segunda página da lista');
    const segundoMais = document.getElementById('card-mais');
    if (!visivel(segundoMais)) throw new Error('segundo carregar mais ficou oculto na busca');

    segundoMais.click();
    await esperar(() => document.querySelector('#lista').textContent.includes('Agulha pesquisável'), 5000, 'terceira página pesquisável');
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

    document.getElementById('btn-config').click();
    const optin = document.getElementById('optin-rascunhos');
    optin.checked = true;
    optin.dispatchEvent(new Event('change', { bubbles: true }));
    entrada.value = 'rascunho local controlado';
    entrada.dispatchEvent(new Event('input', { bubbles: true }));
    await esperar(() => rascunhoLocalAtual() && rascunhoLocalAtual().texto === 'rascunho local controlado', 5000, 'rascunho local');
    entrada.value = '';
    atualizarAvisoRascunho();
    const avisoRascunho = document.getElementById('aviso-rascunho');
    if (!visivel(avisoRascunho)) throw new Error('rascunho local não ofereceu restauração explícita');
    document.getElementById('btn-restaurar-rascunho').click();
    if (entrada.value !== 'rascunho local controlado') throw new Error('restauração local não devolveu o texto exato');

    const apagarFavoritos = document.getElementById('btn-apagar-favoritos');
    apagarFavoritos.click();
    await esperarOrganizacao(() => document.getElementById('resumo-favoritos-locais').textContent.includes('0 favoritos guardados'), 'limpar favoritos');
    if (document.querySelector('#lista .conv-conversa[data-conversa-numero="1"] .conv-favorita').getAttribute('aria-pressed') !== 'false') {
      throw new Error('limpeza explícita não removeu favorito local');
    }
    const apagarColecoes = document.getElementById('btn-apagar-colecoes');
    apagarColecoes.click();
    await esperarColecoes(() => document.getElementById('resumo-colecoes-locais').textContent.includes('Nenhuma coleção local criada'), 'limpar coleções');
    if (seletorColecao.value || [...seletorColecao.options].some(opcao => opcao.textContent.includes('Coleção de fixture'))) {
      throw new Error('limpeza explícita não removeu coleção local');
    }

    const resultadoWorkspace = await testarWorkspace();
    document.body.dataset.browserE2e = 'PASS: favoritos locais marcaram, filtraram e apagaram sem rede; coleções locais criaram, associaram, filtraram e apagaram sem rede; busca ativa manteve carregar mais; nova conversa oculta; alvo da página 3 visível; PWA protegeu rascunho; rascunho local opt-in restaurou sem rede' + resultadoWorkspace;
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
  const html = new Set(['index.html', 'direto.html', 'ligar.html', 'limpar.html']);
  const estaticos = new Map([
    ['chat-estilos.css', 'text/css; charset=utf-8'],
    ['chat-pwa.js', 'application/javascript; charset=utf-8'],
    ['chat-comandos-locais.js', 'application/javascript; charset=utf-8'],
    ['chat-filtro-chips.js', 'application/javascript; charset=utf-8'],
    ['chat-organizacao-local.js', 'application/javascript; charset=utf-8'],
    ['chat-colecoes-local.js', 'application/javascript; charset=utf-8'],
    ['chat-workspace.js', 'application/javascript; charset=utf-8'],
    ['dna.json', 'application/json; charset=utf-8']
  ]);
  if (html.has(arquivo) || estaticos.has(arquivo)) {
    const tipo = html.has(arquivo) ? 'text/html; charset=utf-8' : estaticos.get(arquivo);
    resposta.writeHead(200, { 'content-type': tipo, 'cache-control': 'no-store' });
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

# Primeiro roda a regressão completa das quatro rotas no perfil padrão do navegador.
# O ciclo de armazenamento do Workspace usa IndexedDB real; o orçamento é virtual,
# e o timeout externo mantém a execução física curta e limitada.
for rota in "${rotas[@]}"; do
  nome="${rota%.html}"
  dom="$trabalho/dom-$nome.html"
  erro="$trabalho/navegador-$nome.err"
  orcamento=25000000
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
    "$url" > "$dom" 2>"$erro"

  if grep -Eq 'INFO:CONSOLE.*(Uncaught|Error)' "$erro"; then
    echo "ERRO: exceção JavaScript na fixture $rota" >&2
    grep 'INFO:CONSOLE' "$erro" >&2 || true
    exit 1
  fi
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
if rota == 'index.html':
    assert 'Workspace criou, versionou e recuperou arquivo/projeto somente na fixture' in texto, f'{rota}: ciclo Workspace não foi concluído'
print('✔ navegador controlado · padrão · ' + rota + ' · ' + texto)
PY
done

# Uma segunda passagem limitada abre a casca do Workspace em desktop e celular,
# mede as colunas já aplicadas pelo navegador e captura somente a fixture sintética.
for viewport in desktop mobile; do
  janela='1280,900'
  if [ "$viewport" = 'mobile' ]; then janela='390,844'; fi
  dom="$trabalho/dom-layout-$viewport.html"
  captura="$trabalho/captura-layout-$viewport.png"
  erro="$trabalho/navegador-layout-$viewport.err"
  url="http://127.0.0.1:$porta/index.html?viewport=$viewport&somente-layout=1"
  timeout 60 "$navegador" \
    --headless --no-sandbox --disable-gpu --no-first-run --disable-background-networking --disable-sync \
    --host-resolver-rules='MAP * 0.0.0.0, EXCLUDE 127.0.0.1' \
    --window-size="$janela" --force-device-scale-factor=1 --hide-scrollbars \
    --user-data-dir="$trabalho/perfil-layout-$viewport" --virtual-time-budget=25000000 --dump-dom --screenshot="$captura" \
    "$url" > "$dom" 2>"$erro"

  if grep -Eq 'INFO:CONSOLE.*(Uncaught|Error)' "$erro"; then
    echo "ERRO: exceção JavaScript na fixture de layout $viewport" >&2
    grep 'INFO:CONSOLE' "$erro" >&2 || true
    exit 1
  fi
  python3 - "$captura" "$viewport" <<'PY'
from pathlib import Path
import struct
import sys

png = Path(sys.argv[1]).read_bytes()
assert png[:8] == b'\x89PNG\r\n\x1a\n', 'captura PNG ausente ou inválida'
largura, altura = struct.unpack('>II', png[16:24])
assert largura >= 300 and altura >= 300, f'captura pequena demais: {largura}x{altura}'
if sys.argv[2] == 'mobile':
    assert largura <= 500, f'viewport estreito não foi aplicado: {largura}px'
PY
  python3 - "$dom" "$viewport" <<'PY'
from pathlib import Path
import html
import re
import sys

conteudo = Path(sys.argv[1]).read_text()
viewport = sys.argv[2]
resultado = re.search(r'data-browser-e2e="([^"]*)"', conteudo)
assert resultado, f'layout {viewport}: resultado do navegador ausente'
texto = html.unescape(resultado.group(1))
assert texto.startswith('PASS:'), f'layout {viewport}: {texto}'
assert ('Workspace abriu com a casca local e o layout ' + viewport + ' controlado') in texto, f'layout {viewport}: Workspace não foi validado'
print('✔ navegador controlado · layout ' + viewport + ' · ' + texto)
PY
done
