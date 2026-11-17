// RASTREIO DE ALCANÇABILIDADE — a resposta para "isto é dívida ou é fixture?".
//
// Critério do instrutor (17/11/2026), e é ele que este script implementa:
//
//   "Cobertura é dívida se, e somente se, o código for alcançável de um ponto de entrada de
//    produção ou executado por um workflow."
//
// Ponto de entrada de produção, aqui, é o que roda sozinho: os scripts do `package.json`
// e todo arquivo citado por um workflow em `.github/workflows/`. A partir deles o script
// segue o grafo de `require`/`import` transitivamente. Arquivo fora do fecho é FIXTURE:
// não se testa, e sai do denominador de cobertura.
//
// Uso:
//   node tools/testes/rastreio-alcancavel.js              # resumo + lista dos não alcançáveis
//   node tools/testes/rastreio-alcancavel.js --lista <arq> # confere uma lista (ex.: o ranking)
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const IGNORAR = new Set(['node_modules', '.git', 'uploads']);

function todosJs(dir = RAIZ, saida = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORAR.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) todosJs(p, saida);
    else if (/\.(js|cjs|mjs)$/.test(e.name)) saida.push(path.relative(RAIZ, p));
  }
  return saida;
}

function arquivosDeWorkflow() {
  const d = path.join(RAIZ, '.github', 'workflows');
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter(n => /\.ya?ml$/.test(n)).map(n => path.join(d, n));
}

function pontosDeEntrada() {
  const entradas = new Set();
  const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
  for (const cmd of Object.values(pkg.scripts || {})) {
    for (const m of String(cmd).matchAll(/(?:^|\s)([\w./-]+\.(?:js|cjs|mjs))/g)) entradas.add(m[1].replace(/^\.\//, ''));
  }
  const corpus = arquivosDeWorkflow().map(f => fs.readFileSync(f, 'utf8')).join('\n');
  for (const arq of todosJs()) if (corpus.includes(arq)) entradas.add(arq);
  return [...entradas];
}

function requeridosPor(arquivo) {
  const txt = fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
  const out = [];
  for (const m of txt.matchAll(/(?:require|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    const alvo = m[1];
    if (!alvo.startsWith('.')) continue;
    let abs = path.resolve(path.dirname(path.join(RAIZ, arquivo)), alvo);
    if (!/\.(js|cjs|mjs)$/.test(abs)) abs += '.js';
    const rel = path.relative(RAIZ, abs);
    if (fs.existsSync(path.join(RAIZ, rel))) out.push(rel);
  }
  return out;
}

function fechoAlcancavel() {
  const entradas = pontosDeEntrada();
  const visto = new Set();
  const fila = [...entradas];
  while (fila.length) {
    const atual = fila.pop();
    if (visto.has(atual) || !fs.existsSync(path.join(RAIZ, atual))) continue;
    visto.add(atual);
    for (const r of requeridosPor(atual)) if (!visto.has(r)) fila.push(r);
  }
  return { entradas, alcancaveis: visto };
}

if (require.main === module) {
  const { entradas, alcancaveis } = fechoAlcancavel();
  const js = todosJs();
  const mortos = js.filter(a => !alcancaveis.has(a));
  console.log('pontos de entrada (' + entradas.length + '): ' + entradas.slice(0, 8).join(', ') +
    (entradas.length > 8 ? ' …' : ''));
  console.log('.js no repositório: ' + js.length + ' · alcançáveis: ' + alcancaveis.size +
    ' · fora do fecho (fixture): ' + mortos.length);

  const i = process.argv.indexOf('--lista');
  if (i > 0) {
    const lista = JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8'))
      .map(x => (typeof x === 'string' ? x : x.arquivo));
    const dentro = lista.filter(f => alcancaveis.has(f));
    const fora = lista.filter(f => !alcancaveis.has(f));
    console.log('\nlista conferida: ' + lista.length + ' arquivos');
    console.log('  alcançáveis (DÍVIDA, entram no denominador): ' + dentro.length);
    dentro.forEach(f => console.log('    ' + f));
    console.log('  fora do fecho (FIXTURE, saem do denominador): ' + fora.length);
    fora.slice(0, 40).forEach(f => console.log('    ' + f));
    if (fora.length > 40) console.log('    … +' + (fora.length - 40));
  } else {
    const porPasta = {};
    for (const m of mortos) {
      const pasta = m.includes('/') ? m.split('/')[0] : '(raiz)';
      porPasta[pasta] = (porPasta[pasta] || 0) + 1;
    }
    console.log('\nfora do fecho, por pasta:');
    for (const [p, n] of Object.entries(porPasta).sort((a, b) => b[1] - a[1])) console.log('  ' + p + ': ' + n);
  }
}

module.exports = { fechoAlcancavel, pontosDeEntrada, todosJs };
