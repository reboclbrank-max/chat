// COBERTURA DE LINHAS — quais linhas de cada módulo os testes que o mapa aponta REALMENTE executam.
// Usa NODE_V8_COVERAGE (cobertura nativa do V8), não palpite nem regex.
//
// Uso: node tools/testes/cobertura-linhas.js [saida.json]
//
// É o instrumento que separa, entre os mutantes vivos, o que "nunca executa"
// (fora do denominador) do que executa e sobreviveu (buraco real).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DIR = __dirname;
const RAIZ = path.resolve(DIR, '..', '..');
const CHAT = path.join(RAIZ, 'tools', 'email-chat.js');
const MAPA = path.join(DIR, 'mapa-cobertura.json');
const TEMPOS = path.join(DIR, 'mutador-tempos.json');
const saida = process.argv[2] || path.join(DIR, 'cobertura-linhas.json');
const LENTO_MS = 20000;

const mapa = JSON.parse(fs.readFileSync(MAPA, 'utf8'));
let tempos = {};
try { tempos = JSON.parse(fs.readFileSync(TEMPOS, 'utf8')); } catch (e) {}

function testesQueCobrem(alvo) {
  const out = [];
  for (const [arq, info] of Object.entries(mapa.testes)) {
    if (info.ehHelper) continue;
    const mods = [].concat(info.modulosRequeridos || [], info.modulosLidosEstaticamente || []);
    if (mods.includes(alvo)) out.push(arq);
  }
  return out.sort((a, b) => ((tempos[a] && tempos[a].ms) || 5000) - ((tempos[b] && tempos[b].ms) || 5000));
}

// módulos com código executável (fora os que não são .js de fonte e os externos)
const alvos = new Set();
for (const info of Object.values(mapa.testes)) {
  if (info.ehHelper) continue;
  for (const m of [].concat(info.modulosRequeridos || [], info.modulosLidosEstaticamente || [])) {
    if (m.endsWith('.js') && !m.startsWith('externo:')) alvos.add(m);
  }
}

// Extrai as faixas com count 0 (código NÃO executado) e se o arquivo foi carregado.
// O envelope do módulo tem count>0 cobrindo o arquivo inteiro, então o certo é descontar
// as faixas mortas: o que sobra é o que o processo realmente passou.
function leCobertura(dirCov, abs) {
  const url = 'file://' + abs;
  let carregado = false;
  const mortas = [];
  let arquivos = [];
  try { arquivos = fs.readdirSync(dirCov); } catch (e) { return { carregado, mortas }; }
  for (const f of arquivos) {
    let dados;
    try { dados = JSON.parse(fs.readFileSync(path.join(dirCov, f), 'utf8')); } catch (e) { continue; }
    for (const script of dados.result || []) {
      if ((script.url || '') !== url) continue;
      carregado = true;
      for (const fn of script.functions || []) {
        for (const r of fn.ranges || []) {
          if (!r.count) mortas.push([r.startOffset, r.endOffset]);
        }
      }
    }
  }
  return { carregado, mortas };
}

function faixasParaLinhas(texto, faixas) {
  const quebras = [];
  for (let i = 0; i < texto.length; i++) if (texto[i] === '\n') quebras.push(i);
  const linhaDe = (off) => {
    let lo = 0, hi = quebras.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (quebras[mid] < off) lo = mid + 1; else hi = mid; }
    return lo + 1;
  };
  const linhas = new Set();
  for (const [a, b] of faixas) {
    const la = linhaDe(a), lb = linhaDe(b);
    for (let l = la; l <= lb; l++) linhas.add(l);
  }
  return linhas;
}

const resultado = {};
let executados = 0;

for (const alvo of [...alvos].sort()) {
  const abs = path.join(RAIZ, alvo);
  if (!fs.existsSync(abs)) { resultado[alvo] = { erro: 'não existe', linhasExecutadas: [] }; continue; }
  const texto = fs.readFileSync(abs, 'utf8');
  const totalLinhas = texto.split('\n').length;
  const testes = testesQueCobrem(alvo).filter(t => ((tempos[t] && tempos[t].ms) || 5000) <= LENTO_MS);
  const uniao = new Set();
  const porTeste = {};

  for (const t of testes) {
    const dirCov = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-'));
    const flags = t === 'navegador-csp.js' && typeof WebSocket !== 'function' ? ['--experimental-websocket'] : [];
    spawnSync(process.execPath, flags.concat([path.join(DIR, t), CHAT]), {
      encoding: 'utf8', timeout: 200000, env: Object.assign({}, process.env, { NODE_V8_COVERAGE: dirCov }),
    });
    const { carregado, mortas } = leCobertura(dirCov, abs);
    const mortasLinhas = faixasParaLinhas(texto, mortas);
    const vivas = [];
    if (carregado) {
      for (let l = 1; l <= totalLinhas; l++) if (!mortasLinhas.has(l)) vivas.push(l);
    }
    porTeste[t] = vivas;
    for (const l of vivas) uniao.add(l);
    fs.rmSync(dirCov, { recursive: true, force: true });
  }

  const lista = [...uniao].sort((a, b) => a - b);
  if (lista.length) executados++;
  resultado[alvo] = {
    linhas: totalLinhas,
    testesQueExecutam: testes.length,
    linhasExecutadas: lista,
    percentual: totalLinhas ? Math.round((lista.length / totalLinhas) * 100) : 0,
    porTeste,
  };
  console.log(alvo.padEnd(44) + String(lista.length).padStart(5) + '/' + String(totalLinhas).padStart(5) +
    ' linhas  ' + String(resultado[alvo].percentual).padStart(3) + '%  via ' + testes.length + ' teste(s)');
}

fs.writeFileSync(saida, JSON.stringify({ geradoEm: new Date().toISOString(), modulos: resultado }, null, 2) + '\n');
console.log('\nmódulos com alguma linha executada: ' + executados + '/' + alvos.size + ' → ' + saida);
