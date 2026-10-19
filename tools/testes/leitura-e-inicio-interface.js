// Preferência de leitura e pontos de partida: contrato offline, sem API, token ou navegador real.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0;
let falhas = 0;
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function fonte(rota) { return fs.readFileSync(path.join(raiz, rota), 'utf8'); }
function trecho(texto, inicio, fim) {
  const a = texto.indexOf(inicio);
  const b = texto.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho ausente: ' + inicio);
  return texto.slice(a, b);
}
const fontes = Object.fromEntries(rotas.map((rota) => [rota, fonte(rota)]));
const estilos = fonte('chat-estilos.css');
function blocoLeitura(html) { return trecho(html, 'const CHAVE_LEITURA_CONFORTAVEL', '\nfunction atualizarContador()'); }
function blocoGuia(html) { return trecho(html, 'const INICIOS_GUIA', "$('btn-limpar-copias').onclick"); }
function blocoNova(html) { return trecho(html, 'async function novaConversa(', '\n\n/* ---------- conversa ---------- */'); }

for (const rota of rotas) {
  const html = fontes[rota];
  testa(rota + ' oferece leitura confortável persistida e acessível', () => {
    assert.match(html, /id="btn-leitura-confortavel"/);
    assert.match(html, /aria-pressed="false"/);
    assert.match(estilos, /body\.leitura-confortavel/);
    assert.match(html, /function aplicarLeituraConfortavel\(\)/);
    assert.match(html, /function alternarLeituraConfortavel\(\)/);
    assert.match(html, /\$\('btn-leitura-confortavel'\)\.onclick = alternarLeituraConfortavel;/);
  });
  testa(rota + ' apresenta tarefas sem iniciar consulta automaticamente', () => {
    assert.match(html, /id="atalhos-inicio"/);
    for (const chave of ['escrever', 'pesquisar', 'organizar', 'calcular', 'explorar']) {
      assert.match(html, new RegExp('data-inicio="' + chave + '"'));
    }
    assert.match(html, /O texto abre para revisão antes de criar uma conversa/);
    assert.match(html, /pesquisar pode consultar fontes públicas somente depois da sua confirmação/);
  });
  testa(rota + ' mantém rascunho recuperável acima de sugestão de tarefa', () => {
    const nova = blocoNova(html);
    assert.match(nova, /async function novaConversa\(sugestao = ''\)/);
    assert.match(nova, /const padrao = rascunhoNovo \? rascunhoNovo\.texto : \(typeof sugestao === 'string' \? sugestao : ''\);/);
    assert.match(nova, /prompt\('Primeira mensagem:', padrao\)/);
  });
}

testa('blocos de leitura, guia e criação inicial permanecem idênticos nas quatro rotas', () => {
  assert.equal(new Set(Object.values(fontes).map(blocoLeitura)).size, 1);
  assert.equal(new Set(Object.values(fontes).map(blocoGuia)).size, 1);
  assert.equal(new Set(Object.values(fontes).map(blocoNova)).size, 1);
});
testa('preferência de leitura só altera classe e preferência local', () => {
  const memoria = Object.create(null);
  const classe = new Set();
  const botao = { textContent: '', attrs: {}, setAttribute(chave, valor) { this.attrs[chave] = valor; } };
  const contexto = {
    localStorage: { getItem: (k) => memoria[k] || null, setItem: (k, v) => { memoria[k] = String(v); } },
    document: { body: { classList: { toggle: (nome, ativo) => { if (ativo) classe.add(nome); else classe.delete(nome); } } }, getElementById: (id) => id === 'btn-leitura-confortavel' ? botao : null }
  };
  vm.createContext(contexto);
  vm.runInContext('const $ = (id) => document.getElementById(id);\n' + blocoLeitura(fontes['index.html']) + '\nglobalThis.aplicarTeste = aplicarLeituraConfortavel; globalThis.alternarTeste = alternarLeituraConfortavel;', contexto);
  contexto.aplicarTeste();
  assert.equal(classe.has('leitura-confortavel'), false);
  assert.equal(botao.attrs['aria-pressed'], 'false');
  contexto.alternarTeste();
  assert.equal(memoria.assistente_rebocl_leitura_confortavel, '1');
  assert.equal(classe.has('leitura-confortavel'), true);
  assert.equal(botao.attrs['aria-pressed'], 'true');
});
testa('guia usa allowlist fechada e só abre o prompt de nova conversa', () => {
  const chamadas = [];
  const contexto = { Object, String, mostrarConfig: (valor) => chamadas.push(['config', valor]), novaConversa: (texto) => chamadas.push(['nova', texto]) };
  vm.createContext(contexto);
  vm.runInContext(blocoGuia(fontes['index.html']) + '\nglobalThis.iniciarTeste = iniciarPelaTarefa;', contexto);
  contexto.iniciarTeste('pesquisar');
  contexto.iniciarTeste('injetado');
  assert.deepEqual(chamadas, [['config', false], ['nova', '!busca ']]);
  assert.doesNotMatch(blocoGuia(fontes['index.html']), /\bfetch\s*\(|\bapi\s*\(|token|localStorage/);
});

console.log(`${certos}/${certos + falhas} testes de leitura e início guiado passaram`);
process.exitCode = falhas ? 1 : 0;
