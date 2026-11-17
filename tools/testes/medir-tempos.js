// Mede a duração de cada teste isolado (para o mutador saber o custo antes de rodar).
// Uso: node tools/testes/medir-tempos.js [saida.json]
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DIR = __dirname;
const RAIZ = path.resolve(DIR, '..', '..');
const CHAT = path.join(RAIZ, 'tools', 'email-chat.js');
const saida = process.argv[2] || path.join(DIR, 'mutador-tempos.json');
const FLAGS = { 'navegador-csp.js': ['--experimental-websocket'] };

const arquivos = fs.readdirSync(DIR)
  .filter(f => f.endsWith('.js'))
  .filter(f => !['roda-testes.js', 'simula-caixa.js', 'pre-requisitos.js', 'cdp.js',
    'sondar-cdp.mjs', 'gerar-mapa.js', 'mutador.js', 'medir-tempos.js'].includes(f))
  .sort();

const tempos = {};
for (const f of arquivos) {
  const flags = (FLAGS[f] || []).filter(() => typeof WebSocket !== 'function');
  const t0 = Date.now();
  const r = spawnSync(process.execPath, flags.concat([path.join(DIR, f), CHAT]), { encoding: 'utf8', timeout: 200000 });
  const ms = Date.now() - t0;
  const ultima = String(r.stdout || '').trim().split('\n').pop() || '';
  const ignorado = r.status === 0 && /^SKIP:/.test(ultima);
  tempos[f] = { ms, status: r.status, ignorado, ultima: ultima.slice(0, 120) };
  console.log(String(ms).padStart(7) + 'ms rc=' + r.status + ' ' + f);
}
fs.writeFileSync(saida, JSON.stringify(tempos, null, 2) + '\n');
console.log('gravado em ' + saida + ' (' + Object.keys(tempos).length + ' testes)');
