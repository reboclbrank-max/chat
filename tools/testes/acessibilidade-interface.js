// Contrato estático de acessibilidade e controles de teclado nas quatro rotas.
// Não abre conta, não usa token, navegador, API ou conversa real.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0;
let falhas = 0;
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function fonte(rota) { return fs.readFileSync(path.join(raiz, rota), 'utf8'); }
function trechoInterface(html) {
  const inicio = html.indexOf('<header');
  const fim = html.indexOf('<script>', inicio);
  assert(inicio >= 0 && fim > inicio, 'casca da interface ausente');
  return html.slice(inicio, fim);
}
function ids(html) { return Array.from(html.matchAll(/\bid="([^"]+)"/g), (m) => m[1]); }

const fontes = Object.fromEntries(rotas.map((rota) => [rota, fonte(rota)]));
const estilos = fonte('chat-estilos.css');
const cascas = Object.values(fontes).map(trechoInterface);
testa('as quatro rotas mantêm a mesma casca acessível', () => {
  assert.equal(new Set(cascas).size, 1);
});

testa('ações de cada mensagem permanecem acessíveis por teclado e toque', () => {
  assert.match(estilos, /\.bolha \.acoes\{position:absolute;top:5px;right:7px;display:block;opacity:0;pointer-events:none\}/);
  assert.match(estilos, /\.bolha:hover \.acoes,\.bolha:focus-within \.acoes\{opacity:1;pointer-events:auto\}/);
  assert.match(estilos, /@media \(hover:none\),\(pointer:coarse\)\{\.bolha \.acoes\{opacity:1;pointer-events:auto\}\}/);
});

testa('ações de cada mensagem reservam espaço e alvo mínimo de toque', () => {
  assert.match(estilos, /\.bolha\{[^}]*padding:10px 42px 10px 13px[^}]*\}/);
  assert.match(estilos, /\.bolha \.acoes button\{[^}]*min-width:24px;min-height:24px;display:inline-flex;align-items:center;justify-content:center[^}]*\}/);
});

testa('controle de ouvir resposta preserva alvo mínimo sem ação nova', () => {
  assert.match(estilos, /\.bolha \.quem \.falar\{[^}]*min-width:24px;min-height:24px;display:inline-flex;align-items:center;justify-content:center[^}]*\}/);
});

testa('voltar da conversa preserva alvo mínimo sem alterar o fluxo', () => {
  assert.match(estilos, /#cabecalho-conv button\.voltar\{[^}]*min-width:24px;min-height:24px;display:inline-flex;align-items:center;justify-content:center[^}]*\}/);
});

testa('voltar da configuração preserva alvo mínimo sem alterar o fluxo', () => {
  assert.match(estilos, /#btn-voltar-config\{min-width:24px;min-height:24px;display:inline-flex;align-items:center;justify-content:center\}/);
});

testa('opt-in de rascunhos preserva alvo nativo mínimo sem mudar a preferência', () => {
  assert.match(estilos, /\.opcao-rascunho\{display:flex;align-items:center;gap:9px;min-height:24px[^}]*\}/);
  assert.match(estilos, /#optin-rascunhos\{width:24px;height:24px;min-width:24px;min-height:24px;flex:0 0 24px;margin:0;padding:0;accent-color:var\(--ouro\)\}/);
});

testa('console dá nome persistente ao tema pensado sem alterar sua ação', () => {
  const consoleHtml = fonte('console.html');
  assert.match(consoleHtml, /<input id="pensar-entrada" aria-label="Tema para pensar com dois motores e juiz" placeholder="🧠 pensar bem sobre… \(2 motores \+ juiz\)">/);
  assert.match(consoleHtml, /\$\('btn-pensar'\)\.onclick = \(\) => \{\n  const t = \$\('pensar-entrada'\)\.value\.trim\(\);\n  if \(t\) mandarOrdem\('pensar: ' \+ t\);\n\};/);
});

testa('console nomeia a atualização sem alterar a consulta existente', () => {
  const consoleHtml = fonte('console.html');
  assert.match(consoleHtml, /<button class="hbtn" id="btn-atualizar" aria-label="Atualizar dados do Console" title="Atualizar agora">🔄<\/button>/);
  assert.match(consoleHtml, /\$\('btn-atualizar'\)\.onclick = \(\) => \{ carregarEstado\(\); carregarOrdens\(\); \};/);
});

testa('console anuncia integralmente o estado publicado sem alterar a consulta', () => {
  const consoleHtml = fonte('console.html');
  assert.match(consoleHtml, /<div id="status" role="status" aria-live="polite" aria-atomic="true">atualizando…<\/div>/);
  assert.match(consoleHtml, /\$\('status'\)\.textContent = 'atualizando…';/);
  assert.match(consoleHtml, /\$\('status'\)\.textContent = '⚠️ sem estado publicado ainda — o agente publica em site\/estado-ia\.json a cada execução';/);
  assert.match(consoleHtml, /\$\('status'\)\.textContent = '✓ estado atualizado ' \+ quando\(est\.atualizado\) \+ ' · próxima atualização em 60 s';/);
});

testa('aviso de acesso em ligar anuncia sem bloquear os controles do cabeçalho', () => {
  const ligar = fontes['ligar.html'];
  assert.match(ligar, /b\.setAttribute\('role','status'\);b\.setAttribute\('aria-live','polite'\)/);
  assert.match(ligar, /z-index:99999[^']*pointer-events:none/);
});

testa('aviso de limpeza anuncia a proteção sem mudar a tela deliberada', () => {
  const limpar = fontes['limpar.html'];
  assert.match(limpar, /role="alert" aria-live="assertive" aria-atomic="true"/);
  assert.match(limpar, /navigator\.serviceWorker[^\n]*unregister/);
  assert.match(limpar, /setTimeout\(function\(\)\{location\.replace\('\/chat\/\?limpo=1'\);\},3000\)/);
});

for (const rota of rotas) {
  const html = fontes[rota];
  testa(rota + ' não contém IDs duplicados', () => {
    const encontrados = ids(html);
    const duplicados = encontrados.filter((id, indice) => encontrados.indexOf(id) !== indice);
    assert.deepEqual([...new Set(duplicados)], []);
  });
  testa(rota + ' anuncia estados e expõe a conversa como log', () => {
    assert.match(html, /id="faixa" role="status" aria-live="polite"/);
    assert.match(html, /id="status-conexao" role="status" aria-live="polite"/);
    assert.match(html, /id="status-exportar" role="status" aria-live="polite"/);
    assert.match(html, /id="msgs" role="log" aria-live="polite" aria-relevant="additions text"/);
  });
  testa(rota + ' oferece nomes a controles e campos centrais', () => {
    for (const id of ['btn-console', 'btn-config', 'btn-voltar', 'btn-enviar', 'btn-mic', 'btn-mic-top', 'btn-local', 'btn-turbo', 'btn-reenviar']) {
      const re = new RegExp('<(?:button|input)[^>]*\\bid="' + id + '"[^>]*\\baria-label="[^"]+"');
      assert.match(html, re, id + ' sem nome acessível');
    }
    assert.match(html, /<label class="visualmente-oculto" for="busca">/);
    assert.match(html, /<label class="visualmente-oculto" for="token">/);
    assert.match(html, /<label class="visualmente-oculto" for="entrada">/);
  });
  testa(rota + ' preserva foco visível e reduz movimento quando pedido', () => {
    assert.match(estilos, /button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible/);
    assert.match(estilos, /@media \(prefers-reduced-motion:reduce\)/);
    assert.match(html, /function focoSeguro\(id\)/);
    assert.match(html, /focoSeguro\('titulo-conv'\)/);
    assert.match(html, /focoSeguro\('busca'\)/);
  });
  testa(rota + ' torna cartões de conversa acessíveis por teclado', () => {
    assert.match(html, /function ativarComoBotao\(elemento, acao, rotulo\)/);
    assert.match(html, /elemento\.tabIndex = 0/);
    assert.match(html, /elemento\.setAttribute\('role', 'button'\)/);
    assert.match(html, /e\.key === 'Enter' \|\| e\.key === ' '/);
    assert.match(html, /ativarComoBotao\(nova, novaConversa, 'Criar nova conversa'\)/);
  });
  testa(rota + ' usa um único fluxo de ditado e estado ARIA', () => {
    assert.match(html, /id="btn-mic-top" data-acao="ditado"/);
    assert.match(html, /id="btn-mic" data-acao="ditado"/);
    assert.match(html, /function botoesMicrofone\(\)/);
    assert.match(html, /function marcarMicrofone\(ativo\)/);
    assert.match(html, /\$\('btn-mic'\)\.onclick = alternarMicrofone/);
    assert.match(html, /\$\('btn-mic-top'\)\.onclick = alternarMicrofone/);
    assert.doesNotMatch(html, /function falarAgora\(/);
  });
  testa(rota + ' fornece diálogo de imagem com retorno de foco', () => {
    assert.match(html, /id="lightbox" role="dialog" aria-modal="true"/);
    assert.match(html, /function fecharLightbox\(\)/);
    assert.match(html, /_lightbox\.setAttribute\('aria-hidden', 'false'\)/);
    assert.match(html, /if \(e\.key === 'Escape'\) \{ if \(_lightbox/);
  });
  testa(rota + ' torna imagens ampliáveis alcançáveis e mantém o foco no diálogo', () => {
    assert.match(html, /function prepararImagemAmpliavel\(img\)/);
    assert.match(html, /img\.tabIndex = 0/);
    assert.match(html, /img\.setAttribute\('role', 'button'\)/);
    assert.match(html, /img\.setAttribute\('aria-haspopup', 'dialog'\)/);
    assert.match(html, /e\.key === 'Enter' \|\| e\.key === ' '/);
    assert.match(html, /const img = e\.target && e\.target\.tagName === 'IMG' \? e\.target : null/);
    assert.match(html, /if \(img && img\.closest\('\.bolha'\)\) abrirLightbox\(img\)/);
    assert.match(html, /_lightbox\.addEventListener\('keydown', \(e\) => \{\n    if \(e\.key === 'Tab'\) \{ e\.preventDefault\(\); _lightbox\.focus\(\); \}/);
    assert.match(html, /new MutationObserver\(\(mudancas\) =>/);
  });
}

console.log(`${certos}/${certos + falhas} testes de acessibilidade da interface passaram`);
process.exitCode = falhas ? 1 : 0;
