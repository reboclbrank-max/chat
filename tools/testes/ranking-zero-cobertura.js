// RANKING de risco das fontes .js com ZERO cobertura.
//
// A lista alfabética não diz o que atacar primeiro. Este script pontua cada arquivo com
// critério declarado e reproduzível — três eixos, todos medidos no próprio texto do arquivo:
//
//   TAMANHO (0–3)   linhas de código: 0 se <50, 1 se <150, 2 se <400, 3 acima
//   EFEITO  (0–6)   3 se escreve/apaga em disco (fs.write*/rm/unlink) ou empurra processo
//                   (spawn/exec/execFile), +2 se fala com a rede (fetch/https.request/
//                   net.connect), +1 se usa credencial (process.env com TOKEN/KEY/SECRET)
//   HISTÓRICO (0–4) quantas vezes o arquivo aparece em CONTINUIDADE.md (incidente/rodada)
//                   ou em commit de correção (`fix:`/`corrige`) — 0, 1, 2, 3, 4+
//
// Uso: node tools/testes/ranking-zero-cobertura.js [--json]
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DIR = __dirname;
const RAIZ = path.resolve(DIR, '..', '..');
const cobertura = JSON.parse(fs.readFileSync(path.join(DIR, 'cobertura-fonte.json'), 'utf8'));

const fontes = cobertura.zeroCoberturaLista.filter(f => /\.(js|mjs|cjs)$/.test(f));

function linhasDe(rel) {
  try { return fs.readFileSync(path.join(RAIZ, rel), 'utf8').split('\n').length; } catch (e) { return 0; }
}
function historico(rel) {
  const base = path.basename(rel);
  let n = 0;
  try {
    const cont = fs.readFileSync(path.join(RAIZ, 'CONTINUIDADE.md'), 'utf8');
    n += (cont.split(base).length - 1);
  } catch (e) {}
  try {
    const saida = execFileSync('git', ['log', '--oneline', '--grep=fix', '--', rel],
      { cwd: RAIZ, encoding: 'utf8' }).trim();
    if (saida) n += saida.split('\n').length;
  } catch (e) {}
  return n;
}

const ranking = fontes.map((rel) => {
  const texto = (() => { try { return fs.readFileSync(path.join(RAIZ, rel), 'utf8'); } catch (e) { return ''; } })();
  const linhas = linhasDe(rel);
  const escreve = /fs\.(writeFile|appendFile|rm|rmSync|unlink|mkdir|rename|copyFile)/.test(texto);
  const processo = /\b(spawn|spawnSync|execSync|execFile|exec)\s*\(/.test(texto);
  const rede = /\bfetch\s*\(|https?\.request|net\.connect|axios/.test(texto);
  const segredo = /process\.env\.[A-Z_]*(TOKEN|KEY|SECRET)/.test(texto);
  const hist = historico(rel);

  const tam = linhas >= 400 ? 3 : linhas >= 150 ? 2 : linhas >= 50 ? 1 : 0;
  const efeito = (escreve || processo ? 3 : 0) + (rede ? 2 : 0) + (segredo ? 1 : 0);
  const histP = hist >= 4 ? 4 : hist >= 3 ? 3 : hist >= 2 ? 2 : hist >= 1 ? 1 : 0;
  return { arquivo: rel, linhas, escreve, processo, rede, segredo, historico: hist, tam, efeito, histP, risco: tam + efeito + histP };
}).sort((a, b) => b.risco - a.risco || b.linhas - a.linhas);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(ranking, null, 2));
} else {
  console.log('critério: risco = TAMANHO(0-3) + EFEITO(0-6) + HISTÓRICO(0-4) · ' + ranking.length + ' arquivos .js com zero cobertura\n');
  console.log('risco  linhas  arq'.padEnd(56) + '  efeitos');
  for (const r of ranking) {
    const efeitos = [r.escreve || r.processo ? 'disco/proc' : '', r.rede ? 'rede' : '', r.segredo ? 'segredo' : '', r.historico ? 'hist:' + r.historico : '']
      .filter(Boolean).join(',') || '—';
    console.log(String(r.risco).padStart(3) + String(r.linhas).padStart(8) + '  ' + r.arquivo.padEnd(56) + efeitos);
  }
}
fs.writeFileSync(path.join(DIR, 'ranking-zero-cobertura.json'), JSON.stringify(ranking, null, 2) + '\n');
