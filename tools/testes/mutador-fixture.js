// MUTADOR DE FIXTURE — o segundo instrumento. Muta o YAML/JSON/HTML que os testes
// ESTÁTICOS afirmam sobre, e vê se algum deles acusa.
//
// Existe porque o mutador de código-fonte é cego para os 57 testes estáticos: eles não
// executam módulo nenhum, afirmam sobre arquivo. Mutar `roteador-ia.js` não diz nada
// sobre um teste que lê `.github/workflows/vigia.yml`.
//
// Uso:
//   node tools/testes/mutador-fixture.js --todos
//   node tools/testes/mutador-fixture.js .github/workflows/vigia.yml
//   node tools/testes/mutador-fixture.js --doutor .github/workflows/vigia.yml
//
// Mesmas garantias do mutador de código: só mutação sutil, seed fixa, kill rate por arquivo,
// restauração em finally + backup em disco + handlers de sinal.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DIR = __dirname;
const RAIZ = path.resolve(DIR, '..', '..');
const MAPA = path.join(DIR, 'mapa-cobertura.json');
const TEMPOS = path.join(DIR, 'mutador-tempos.json');
const PLACAR = path.join(DIR, 'mutador-fixture-placar.json');
const CHAT = path.join(RAIZ, 'tools', 'email-chat.js');
const SUFIXO = '.mutador-fixture-backup';
const LENTO_MS = 20000;

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── catálogo de mutação de fixture ───────────────────────────────────────────
// Cada mutante mexe em UM token do arquivo. Nada de truncar o arquivo, nada de apagar seção.
const CATALOGO = [
  {
    nome: 'trocar-agendamento',
    exts: ['.yml', '.yaml'],
    coletar(texto) {
      const out = [];
      const re = /cron:\s*['"]?([0-9*\/,\- ]+)['"]?/g;
      let m;
      while ((m = re.exec(texto)) !== null) {
        const expr = m[1].trim();
        const campos = expr.split(/\s+/);
        if (campos.length < 5) continue;
        const minuto = campos[0];
        const novo = minuto === '*/5' ? '*/6' : /^\d+$/.test(minuto) ? String((Number(minuto) + 1) % 60) : '*/7';
        const trocado = [novo].concat(campos.slice(1)).join(' ');
        const inicio = m.index, original = m[0];
        out.push({
          tipo: 'trocar-agendamento',
          descricao: 'cron "' + expr + '" → "' + trocado + '"',
          linha: texto.slice(0, inicio).split('\n').length,
          aplica(t) { return t.slice(0, inicio) + original.replace(expr, trocado) + t.slice(inicio + original.length); },
        });
      }
      return out;
    },
  },
  {
    nome: 'abrir-permissao',
    exts: ['.yml', '.yaml'],
    coletar(texto) {
      const out = [];
      const re = /^(\s*)(contents|actions|pull-requests|issues|checks|id-token|packages):\s*(read|none)\s*$/gm;
      let m;
      while ((m = re.exec(texto)) !== null) {
        const inicio = m.index, trecho = m[0], antigo = m[3], novo = antigo === 'read' ? 'write' : 'read';
        out.push({
          tipo: 'abrir-permissao',
          descricao: m[2] + ': ' + antigo + ' → ' + novo,
          linha: texto.slice(0, inicio).split('\n').length,
          aplica(t) { return t.slice(0, inicio) + trecho.replace(/:\s*(\w+)\s*$/, ': ' + novo) + t.slice(inicio + trecho.length); },
        });
      }
      return out;
    },
  },
  {
    nome: 'derrubar-dependencia',
    exts: ['.yml', '.yaml'],
    coletar(texto) {
      const linhas = texto.split('\n');
      const out = [];
      linhas.forEach((linha, i) => {
        if (!/^\s*needs:\s*\S+\s*$/.test(linha)) return;
        out.push({
          tipo: 'derrubar-dependencia',
          descricao: linha.trim() + ' (linha ' + (i + 1) + ') removido',
          linha: i + 1,
          aplica(t) { const ls = t.split('\n'); ls[i] = ''; return ls.join('\n'); },
        });
      });
      return out;
    },
  },
  {
    nome: 'trocar-versao-node',
    exts: ['.yml', '.yaml'],
    coletar(texto) {
      const out = [];
      const re = /node-version:\s*['"]?(\d+)['"]?/g;
      let m;
      while ((m = re.exec(texto)) !== null) {
        const inicio = m.index, trecho = m[0], v = Number(m[1]);
        const nova = v === 22 ? 20 : 22;
        out.push({
          tipo: 'trocar-versao-node',
          descricao: 'node-version ' + v + ' → ' + nova,
          linha: texto.slice(0, inicio).split('\n').length,
          aplica(t) { return t.slice(0, inicio) + trecho.replace(String(v), String(nova)) + t.slice(inicio + trecho.length); },
        });
      }
      return out;
    },
  },
  {
    nome: 'trocar-limite-json',
    exts: ['.json'],
    coletar(texto) {
      const out = [];
      const re = /"(max[A-Za-z_]*|limite[A-Za-z_]*|LIMITE[A-Za-z_]*)"\s*:\s*(\d+)/g;
      let m;
      while ((m = re.exec(texto)) !== null) {
        const inicio = m.index, trecho = m[0], n = Number(m[2]);
        const novo = n > 1 ? n - 1 : n + 1;
        out.push({
          tipo: 'trocar-limite-json',
          descricao: '"' + m[1] + '": ' + n + ' → ' + novo,
          linha: texto.slice(0, inicio).split('\n').length,
          aplica(t) { return t.slice(0, inicio) + trecho.replace(String(n), String(novo)) + t.slice(inicio + trecho.length); },
        });
      }
      return out;
    },
  },
  {
    nome: 'afrouxar-csp',
    exts: ['.html', '.js'],
    coletar(texto) {
      const out = [];
      const re = /Content-Security-Policy/gi;
      let m;
      while ((m = re.exec(texto)) !== null) {
        const inicio = m.index, trecho = m[0];
        out.push({
          tipo: 'afrouxar-csp',
          descricao: 'Content-Security-Policy → Content-Security-PolicY (token quebrado, linha ' +
            texto.slice(0, inicio).split('\n').length + ')',
          linha: texto.slice(0, inicio).split('\n').length,
          aplica(t) { return t.slice(0, inicio) + 'Content-Security-PolicY' + t.slice(inicio + trecho.length); },
        });
      }
      return out;
    },
  },
];

// ── segurança (mesma disciplina do mutador de código) ────────────────────────
const protegidos = new Map();
function restauraTudo() {
  for (const [abs, conteudo] of protegidos) {
    try { fs.writeFileSync(abs, conteudo, 'utf8'); } catch (e) {}
    try { if (fs.existsSync(abs + SUFIXO)) fs.unlinkSync(abs + SUFIXO); } catch (e) {}
  }
  protegidos.clear();
}
for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT']) {
  process.on(s, () => { restauraTudo(); console.error('⚠ ' + s + ' — fixture restaurado'); process.exit(130); });
}
process.on('exit', restauraTudo);
process.on('uncaughtException', (e) => { restauraTudo(); console.error('⚠ ' + e.message); process.exit(1); });

function varreOrfaos() {
  const achados = [];
  const pilha = [RAIZ];
  while (pilha.length) {
    const d = pilha.pop();
    let entradas = [];
    try { entradas = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { continue; }
    for (const e of entradas) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) pilha.push(p);
      else if (e.name.endsWith(SUFIXO)) achados.push(p);
    }
  }
  return achados;
}

// ── quem lê a fixture ────────────────────────────────────────────────────────
const mapa = JSON.parse(fs.readFileSync(MAPA, 'utf8'));
let tempos = {};
try { tempos = JSON.parse(fs.readFileSync(TEMPOS, 'utf8')); } catch (e) {}

function testesQueLeem(fixture) {
  const out = new Set();
  const base = path.basename(fixture);
  const dir = path.dirname(fixture);
  for (const [arq, info] of Object.entries(mapa.testes)) {
    if (info.ehHelper) continue;
    const lidos = [].concat(info.modulosLidosEstaticamente || [], info.modulosRequeridos || []);
    if (lidos.includes(fixture)) out.add(arq);
  }
  // O mapa só guarda caminho literal. Teste que varre um DIRETÓRIO (readdir de
  // .github/workflows, por exemplo) não aparece — então confiro no texto do teste
  // se o nome do arquivo ou o diretório dele é citado. Sem isto, o mutador de fixture
  // diria "sem leitor" para um workflow que a suíte audita inteiro.
  for (const t of fs.readdirSync(DIR).filter(f => f.endsWith('.js'))) {
    if (['roda-testes.js', 'simula-caixa.js', 'pre-requisitos.js', 'cdp.js',
      'gerar-mapa.js', 'mutador.js', 'mutador-fixture.js', 'medir-tempos.js',
      'cobertura-linhas.js', 'triagem-vivos.js', 'gerar-cobertura-fonte.js'].includes(t)) continue;
    const texto = fs.readFileSync(path.join(DIR, t), 'utf8');
    if (texto.includes(base) || texto.includes(dir + '/') || texto.includes("'" + dir + "'")) out.add(t);
  }
  return [...out].sort((a, b) => ((tempos[a] && tempos[a].ms) || 5000) - ((tempos[b] && tempos[b].ms) || 5000));
}

function todasFixtures() {
  const alvos = new Set();
  for (const info of Object.values(mapa.testes)) {
    if (info.ehHelper) continue;
    for (const m of [].concat(info.modulosLidosEstaticamente || [], info.modulosRequeridos || [])) {
      if (m.startsWith('externo:')) continue;
      if (!/\.(yml|yaml|json|html)$/.test(m)) continue;
      if (!fs.existsSync(path.join(RAIZ, m))) continue;
      alvos.add(m);
    }
  }
  return [...alvos].sort();
}

const FLAGS = { 'navegador-csp.js': ['--experimental-websocket'] };
function rodaTeste(t) {
  const flags = (FLAGS[t] || []).filter(() => typeof WebSocket !== 'function');
  const r = spawnSync(process.execPath, flags.concat([path.join(DIR, t), CHAT]), { encoding: 'utf8', timeout: 200000 });
  return { status: r.status, saida: String(r.stdout || '') + String(r.stderr || '') };
}

function mutaFixture(rel, opcoes) {
  const abs = path.join(RAIZ, rel);
  const original = fs.readFileSync(abs, 'utf8');
  const leitores = testesQueLeem(rel).filter(t => ((tempos[t] && tempos[t].ms) || 5000) <= LENTO_MS);
  if (!leitores.length) {
    console.log(rel.padEnd(46) + ' SEM LEITOR MAPEADO — 0 mutantes');
    return { fixture: rel, semLeitor: true, mutantes: 0, mortos: 0, vivos: 0, killRate: null };
  }
  const ext = path.extname(rel);
  const todos = [];
  for (const g of CATALOGO) if (g.exts.includes(ext)) for (const m of g.coletar(original)) todos.push(m);
  if (!todos.length) {
    console.log(rel.padEnd(46) + ' nenhum sítio de fixture no catálogo');
    return { fixture: rel, mutantes: 0, mortos: 0, vivos: 0, killRate: null };
  }
  const rand = rng(opcoes.seed);
  for (let i = todos.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [todos[i], todos[j]] = [todos[j], todos[i]]; }
  const escolhidos = todos.slice(0, opcoes.max || todos.length);

  if (!protegidos.has(abs)) { fs.writeFileSync(abs + SUFIXO, original, 'utf8'); protegidos.set(abs, original); }
  let mortos = 0, vivos = 0;
  const detalhes = [];
  try {
    for (const m of escolhidos) {
      const mutante = m.aplica(original);
      if (mutante === original) continue;
      let morto = false, quemMatou = null;
      try {
        fs.writeFileSync(abs, mutante, 'utf8');
        for (const t of leitores) if (rodaTeste(t).status !== 0) { morto = true; quemMatou = t; break; }
      } finally {
        fs.writeFileSync(abs, original, 'utf8');
      }
      if (morto) mortos++; else vivos++;
      detalhes.push({ tipo: m.tipo, descricao: m.descricao, linha: m.linha, morto, quemMatou });
    }
  } finally {
    fs.writeFileSync(abs, original, 'utf8');
    try { fs.unlinkSync(abs + SUFIXO); } catch (e) {}
    protegidos.delete(abs);
  }
  const validos = mortos + vivos;
  const killRate = validos ? Math.round((mortos / validos) * 100) : null;
  if (fs.readFileSync(abs, 'utf8') !== original) { console.error('✘✘ ' + rel + ' não restaurado'); process.exit(1); }
  console.log(rel.padEnd(46) + ' mut ' + String(validos).padStart(2) + '  mortos ' + String(mortos).padStart(2) +
    '  vivos ' + String(vivos).padStart(2) + '  kill ' + String(killRate).padStart(3) + '%  | leitores: ' + leitores.join(','));
  for (const d of detalhes.filter(x => !x.morto)) console.log('      VIVO  [' + d.tipo + '] ' + d.descricao);
  return { fixture: rel, mutantes: validos, mortos, vivos, killRate, leitores, detalhes };
}

function main() {
  for (const o of varreOrfaos()) {
    const alvo = o.slice(0, -SUFIXO.length);
    fs.writeFileSync(alvo, fs.readFileSync(o, 'utf8'), 'utf8');
    fs.unlinkSync(o);
    console.log('⚠ órfão restaurado: ' + path.relative(RAIZ, alvo));
  }
  const args = process.argv.slice(2);
  const seedIdx = args.indexOf('--seed');
  const seed = seedIdx >= 0 ? parseInt(args[seedIdx + 1], 10) : 42;
  const maxIdx = args.indexOf('--max');
  const max = maxIdx >= 0 ? parseInt(args[maxIdx + 1], 10) : 6;
  const opcoes = { seed, max };

  if (args.includes('--todos')) {
    const lista = todasFixtures();
    console.log('MUTADOR DE FIXTURE — ' + lista.length + ' fixtures · seed ' + seed + ' · max ' + max + '\n');
    const resultados = lista.map(f => mutaFixture(f, opcoes)).filter(Boolean);
    const com = resultados.filter(r => r.killRate !== null);
    const mut = com.reduce((s, r) => s + r.mutantes, 0), mor = com.reduce((s, r) => s + r.mortos, 0);
    fs.writeFileSync(PLACAR, JSON.stringify({
      geradoEm: new Date().toISOString(), seed, max, fixtures: resultados.length,
      comLeitor: com.length, mutantes: mut, mortos: mor, vivos: mut - mor,
      killRate: mut ? Math.round((mor / mut) * 100) : null, resultados,
    }, null, 2) + '\n');
    console.log('\n── PLACAR FIXTURE ── com leitor ' + com.length + '/' + resultados.length + ' · mutantes ' + mut +
      ' · mortos ' + mor + ' · vivos ' + (mut - mor) + ' · ' + (mut ? Math.round((mor / mut) * 100) : 0) + '%');
    const zero = com.filter(r => r.killRate === 0).sort((a, b) => b.vivos - a.vivos);
    if (zero.length) { console.log('\n🔴 fixture com kill 0%:'); zero.forEach(r => console.log('   ' + r.fixture + ' → ' + r.vivos + ' vivos')); }
    console.log('\nplacar em tools/testes/mutador-fixture-placar.json');
    return;
  }

  const alvo = args.filter(a => !a.startsWith('--'))[0];
  if (!alvo) { console.log('Uso: node tools/testes/mutador-fixture.js --todos | <fixture>'); process.exit(1); }
  const r = mutaFixture(alvo, opcoes);
  fs.writeFileSync(PLACAR, JSON.stringify({ geradoEm: new Date().toISOString(), seed, max, resultados: [r] }, null, 2) + '\n');
}

main();
