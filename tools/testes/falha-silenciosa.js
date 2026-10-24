// Teto da falha silenciosa — 2026-10-24.
//
// A auditoria de 24/10 contou dezenas de `catch` vazios em 308 `fetch`: quando uma consulta
// falha, a página simplesmente não faz nada e a pessoa fica sem saber se o problema é rede,
// limite do provedor ou resposta vazia. Corrigir os 170 de uma vez seria arriscado — muitos
// escondem falha de propósito (imagem que não carrega, cache indisponível) e o silêncio ali
// é aceitável.
//
// O que este contrato garante é que a dívida não cresça e que o número fique visível:
//  1. a contagem por fonte única (index.html + chat-*.js + sw.js) não passa do teto;
//  2. o teto vigente está escrito na CONTINUIDADE, então subir exige decisão registrada;
//  3. o laço de motores não volta a engolir resposta vazia ou erro de provedor;
//  4. nenhum `catch` vazio pode reaparecer dentro de `pensarStream`.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '../..');
const ler = (nome) => fs.readFileSync(path.join(raiz, nome), 'utf8');
const VAZIO = /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;

// Teto medido em 2026-10-24. Só sobe com decisão registrada na CONTINUIDADE.
const TETO = 169;
const TETO_POR_ARQUIVO = {
  'index.html': 163,
  'chat-colecoes-local.js': 2,
  'chat-diagnostico.js': 1,
  'chat-organizacao-local.js': 1,
  'chat-pwa.js': 1,
  'chat-workspace.js': 1
};

let certos = 0;
let falhas = 0;
function ok(nome, fn) {
  try {
    fn();
    certos++;
    console.log('✔ ' + nome);
  } catch (e) {
    falhas++;
    console.error('✘ ' + nome + ' — ' + e.message);
  }
}

// Fontes de produto. As rotas `direto`, `ligar` e `limpar` são geradas de `index.html`
// (`tools/montar-paginas.js`) e por isso não entram na conta: contariam o mesmo código três vezes.
function fontes() {
  const arquivos = ['index.html', 'sw.js'].concat(
    fs.readdirSync(raiz).filter((f) => /^chat-.+\.js$/.test(f)).sort()
  );
  return arquivos.map((nome) => ({ nome, texto: ler(nome), total: (ler(nome).match(VAZIO) || []).length }));
}

ok('a contagem de catch vazio não passa do teto registrado', () => {
  const lista = fontes();
  const total = lista.reduce((s, f) => s + f.total, 0);
  const detalhe = lista.filter((f) => f.total).map((f) => f.nome + '=' + f.total).join(', ');
  assert(total <= TETO, 'a falha silenciosa cresceu para ' + total + ' (teto ' + TETO + '): ' + detalhe);
  assert(total > 0, 'contagem zerada é sinal de que a varredura parou de achar os blocos: ' + detalhe);
});

ok('nenhum arquivo passou do próprio teto', () => {
  for (const f of fontes()) {
    const teto = TETO_POR_ARQUIVO[f.nome] != null ? TETO_POR_ARQUIVO[f.nome] : 0;
    assert(f.total <= teto, f.nome + ': ' + f.total + ' catch vazio(s), teto ' + teto);
  }
});

ok('o teto vigente está escrito na continuidade', () => {
  const continuidade = ler('CONTINUIDADE.md');
  assert(/teto de falha silenciosa/i.test(continuidade), 'a continuidade precisa nomear o teto');
  assert(new RegExp('teto de falha silenciosa[^|]{0,80}' + TETO).test(continuidade),
    'a continuidade precisa registrar o número ' + TETO);
});

ok('o laço de motores não engole resposta vazia nem erro de provedor', () => {
  for (const rota of ['index.html', 'direto.html', 'ligar.html', 'limpar.html']) {
    const html = ler(rota);
    assert(/diagnosticoFalha\(m, null, r2\.status\)/.test(html), rota + ': resposta não-ok do retry volta a ser silenciosa');
    assert(/diagnosticoFalha\(m, 'vazio', 0\)/.test(html), rota + ': provedor 200 sem texto volta a parecer motor morto');
    assert(/diagnosticoFalha\(\{ nome: 'pollinations · ' \+ mod \}, 'vazio', 0\)/.test(html), rota + ': reserva pollinations silenciosa');
    assert(/diagnosticoFalha\(x2, 'vazio', 0\)/.test(html), rota + ': reserva da reserva silenciosa');
  }
});

ok('pensarStream não esconde falha em catch vazio', () => {
  for (const rota of ['index.html', 'direto.html', 'ligar.html', 'limpar.html']) {
    const html = ler(rota);
    const ini = html.indexOf('async function pensarStream');
    assert(ini > 0, rota + ': pensarStream não encontrada');
    const fim = html.indexOf('\nfunction ', ini + 10);
    const funcao = html.slice(ini, fim > ini ? fim : ini + 20000);
    assert(!/catch\s*(?:\([^)]*\))?\s*\{\s*\}/.test(funcao), rota + ': catch vazio voltou para o laço de motores');
  }
});

ok('o contador cobre o código de produto e não os próprios testes', () => {
  const arquivos = fontes().map((f) => f.nome);
  assert(arquivos.indexOf('index.html') >= 0, 'index.html precisa entrar');
  assert(arquivos.indexOf('sw.js') >= 0, 'sw.js precisa entrar');
  assert(!arquivos.some((a) => a.indexOf('testes') >= 0), 'os testes não entram na conta');
});

console.log('\n' + (falhas ? '✘ ' : '✔ ') + certos + '/' + (certos + falhas) + ' testes de falha silenciosa passaram');
process.exitCode = falhas ? 1 : 0;
