// DENOMINADOR — quantas fontes o repositório tem, quantas algum teste alcança, quantas têm ZERO.
// "Alcançada" = o caminho (ou o nome do arquivo) aparece em algum arquivo de tools/testes/,
// seja por require(), readFileSync(), spawn de processo ou string literal.
//
// Uso: node tools/testes/gerar-cobertura-fonte.js
// Saída: tools/testes/cobertura-fonte.json
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const RAIZ = path.resolve(DIR, '..', '..');
const MAPA = path.join(DIR, 'mapa-cobertura.json');

const EXT_FONTE = new Set(['.js', '.mjs', '.cjs', '.json', '.yml', '.yaml', '.html', '.css', '.md', '.sql', '.sh']);
const IGNORAR_DIR = new Set(['node_modules', '.git', 'coverage', 'dist', 'build', '.github/ISSUE_TEMPLATE']);

function anda(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.relative(RAIZ, path.join(dir, e.name));
    if (IGNORAR_DIR.has(e.name) || IGNORAR_DIR.has(rel)) continue;
    if (e.isDirectory()) anda(path.join(dir, e.name), out);
    else if (EXT_FONTE.has(path.extname(e.name))) out.push(rel);
  }
  return out;
}

// --- o que os testes declaram ---
const mapa = JSON.parse(fs.readFileSync(MAPA, 'utf8'));
const declarados = new Map(); // módulo → [testes]
for (const [arq, info] of Object.entries(mapa.testes)) {
  if (info.ehHelper) continue;
  for (const m of [].concat(info.modulosRequeridos || [], info.modulosLidosEstaticamente || [])) {
    if (m.startsWith('externo:')) continue;
    if (!declarados.has(m)) declarados.set(m, []);
    declarados.get(m).push(arq);
  }
}

// --- o que os testes citam por texto (caminho relativo, basename, ou argumento) ---
const arquivosTeste = fs.readdirSync(DIR).filter(f => f.endsWith('.js'));
const textoTestes = new Map();
for (const t of arquivosTeste) textoTestes.set(t, fs.readFileSync(path.join(DIR, t), 'utf8'));

function citadoEm(rel) {
  const base = path.basename(rel);
  const hits = [];
  for (const [t, texto] of textoTestes) {
    if (texto.includes(rel) || texto.includes(base)) hits.push(t);
  }
  return hits;
}

const fontes = anda(RAIZ).sort();
const detalhe = {};
let alcancadas = 0, zero = 0;
const porCategoria = {};

for (const rel of fontes) {
  const ext = path.extname(rel);
  const ehTeste = rel.startsWith('tools/testes/');
  const decl = declarados.get(rel) || [];
  const cita = decl.length ? [] : citadoEm(rel);
  const alcancada = ehTeste ? true : (decl.length > 0 || cita.length > 0);
  if (!ehTeste) { if (alcancada) alcancadas++; else zero++; }
  const cat = ehTeste ? 'teste' : (ext === '.js' || ext === '.mjs' || ext === '.cjs') ? 'codigo-js'
    : (ext === '.yml' || ext === '.yaml') ? 'workflow/config-yaml'
    : ext === '.json' ? 'dados-json' : ext === '.md' ? 'doc' : 'estatico-web';
  porCategoria[cat] = porCategoria[cat] || { total: 0, alcancadas: 0, zero: 0 };
  porCategoria[cat].total++;
  if (!ehTeste) { if (alcancada) porCategoria[cat].alcancadas++; else porCategoria[cat].zero++; }
  detalhe[rel] = {
    categoria: cat,
    linhas: (() => { try { return fs.readFileSync(path.join(RAIZ, rel), 'utf8').split('\n').length; } catch (e) { return 0; } })(),
    declaradoPor: decl,
    citadoPor: cita.slice(0, 5),
    alcancada,
  };
}

const naoTeste = fontes.filter(f => !f.startsWith('tools/testes/'));
const out = {
  geradoEm: new Date().toISOString(),
  totalArquivos: fontes.length,
  fontesNaoTeste: naoTeste.length,
  alcancadas,
  zeroCobertura: zero,
  percentualAlcancado: naoTeste.length ? Math.round((alcancadas / naoTeste.length) * 100) : 0,
  porCategoria,
  zeroCoberturaLista: naoTeste.filter(f => !detalhe[f].alcancada),
  detalhe,
};
fs.writeFileSync(path.join(DIR, 'cobertura-fonte.json'), JSON.stringify(out, null, 2) + '\n');

console.log('fontes no repo (fora tools/testes): ' + naoTeste.length);
console.log('  alcançadas por algum teste ....... ' + alcancadas + ' (' + out.percentualAlcancado + '%)');
console.log('  com ZERO cobertura ............... ' + zero);
for (const [cat, v] of Object.entries(porCategoria)) {
  console.log('   ' + cat.padEnd(20) + ' total ' + String(v.total).padStart(4) + ' · alcançadas ' + String(v.alcancadas).padStart(4) + ' · zero ' + String(v.zero).padStart(4));
}
