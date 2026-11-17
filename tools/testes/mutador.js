// MUTADOR v2 — sabotagem sutil, uma por vez, com o vermelho na mão.
//
// Uso:
//   node tools/testes/mutador.js tools/instagram/publicador.js
//   node tools/testes/mutador.js tools/instagram/publicador.js --max 6 --seed 42
//   node tools/testes/mutador.js --todos [--max 6] [--orcamento 900]
//   node tools/testes/mutador.js --doutor <alvo> [--linha-re N]
//   node tools/testes/mutador.js --limpar
//
// Regras que este arquivo obedece (critério do instrutor):
//  1. lê mapa-cobertura.json para saber QUAIS testes cobrem o alvo — sabotagem sem mapa é cega;
//  2. só mutação sutil do catálogo; mutação óbvia (apagar módulo, renomear) não entra;
//  3. kill rate POR ARQUIVO, nunca média;
//  4. mesma seed → mesmo placar (RNG mulberry32 + ordem de coleta determinística);
//  5. restaura o original no finally E num backup em disco + handlers de sinal, para que
//     nem SIGKILL/timeout deixe mutante no disco (a lição do `git checkout` que apagou correção);
//  6. ao fim, confere que o arquivo está idêntico ao original e reporta `git status`.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const DIR = __dirname;
const RAIZ = path.resolve(DIR, '..', '..');
const MAPA = path.join(DIR, 'mapa-cobertura.json');
const TEMPOS = path.join(DIR, 'mutador-tempos.json');
const PLACAR = path.join(DIR, 'mutador-placar.json');
const CHAT = path.join(RAIZ, 'tools', 'email-chat.js');
const SUFIXO_BACKUP = '.mutador-backup';

const LENTO_MS = 20000;      // teste acima disso não entra na varredura de mutantes (padrão)
const TIMEOUT_TESTE = 200000;

// ── RNG reprodutível ─────────────────────────────────────────────────────────
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sítio dentro de comentário não é mutante: mudar o texto de um comentário não muda
// comportamento nenhum. Sem este filtro o placar enche de "vivo" que é ruído puro —
// foi o que aconteceu em 17/11 com a palavra Date.now() citada num comentário.
function dentroDeComentario(fonte, indice) {
  const linhaIni = fonte.lastIndexOf('\n', indice) + 1;
  const antes = fonte.slice(linhaIni, indice);
  if (antes.includes('//')) return true;
  // comentário de bloco: último /* sem */ antes do sítio
  const abre = fonte.lastIndexOf('/*', indice);
  if (abre < 0) return false;
  const fecha = fonte.lastIndexOf('*/', indice);
  return fecha < abre;
}

// ── Catálogo: SÓ mutação sutil ───────────────────────────────────────────────
// Cada entrada recebe o fonte e devolve uma lista de mutantes pontuais. Cada mutante
// sabe se descrever e sabe se aplicar. Nada aqui apaga arquivo nem renomeia função.
const CATALOGO = [
  {
    nome: 'inverter-guarda',
    // if (x) → if (!x), um por vez, só em condição simples (identificador ou a.b)
    coletar(fonte) {
      const re = /if\s*\(\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\)/g;
      const out = [];
      let m;
      while ((m = re.exec(fonte)) !== null) {
        const inicio = m.index, texto = m[0], cond = m[1];
        out.push({
          tipo: 'inverter-guarda',
          descricao: 'if (' + cond + ') → if (!' + cond + ')',
          linha: fonte.slice(0, inicio).split('\n').length,
          aplica(f) { return f.slice(0, inicio) + 'if (!' + cond + ')' + f.slice(inicio + texto.length); },
        });
      }
      return out;
    },
  },
  {
    nome: 'trocar-limite',
    // >= → >   e   <= → <   (o mutante do instrutor)
    coletar(fonte) {
      const re = />=|<=/g;
      const out = [];
      let m;
      while ((m = re.exec(fonte)) !== null) {
        const inicio = m.index, texto = m[0], novo = texto === '>=' ? '>' : '<';
        out.push({
          tipo: 'trocar-limite',
          descricao: texto + ' → ' + novo,
          linha: fonte.slice(0, inicio).split('\n').length,
          aplica(f) { return f.slice(0, inicio) + novo + f.slice(inicio + 2); },
        });
      }
      return out;
    },
  },
  {
    nome: 'apagar-escrita',
    // uma escrita (writeFileSync / appendFileSync / mkdirSync sem recursive) vira no-op
    coletar(fonte) {
      const linhas = fonte.split('\n');
      const out = [];
      linhas.forEach((linha, i) => {
        const alvo = linha.match(/(?:fs\.)?(writeFileSync|appendFileSync|mkdirSync|renameSync|copyFileSync)\s*\(/);
        if (!alvo) return;
        out.push({
          tipo: 'apagar-escrita',
          descricao: 'apagar ' + alvo[1] + '() na linha ' + (i + 1),
          linha: i + 1,
          aplica(f) {
            const ls = f.split('\n');
            ls[i] = ls[i].replace(/(?:fs\.)?(writeFileSync|appendFileSync|mkdirSync|renameSync|copyFileSync)\s*\([^;]*\)/, 'void 0');
            return ls.join('\n');
          },
        });
      });
      return out;
    },
  },
  {
    nome: 'devolver-default',
    // return <identificador>; → return null;
    coletar(fonte) {
      const re = /return\s+([A-Za-z_$][\w$]*)\s*;/g;
      const out = [];
      let m;
      while ((m = re.exec(fonte)) !== null) {
        const ident = m[1];
        if (['null', 'undefined', 'true', 'false', 'this'].includes(ident)) continue;
        const inicio = m.index, texto = m[0];
        out.push({
          tipo: 'devolver-default',
          descricao: 'return ' + ident + ' → return null',
          linha: fonte.slice(0, inicio).split('\n').length,
          aplica(f) { return f.slice(0, inicio) + 'return null;' + f.slice(inicio + texto.length); },
        });
      }
      return out;
    },
  },
  {
    nome: 'remover-await',
    coletar(fonte) {
      const re = /await\s+/g;
      const out = [];
      let m;
      while ((m = re.exec(fonte)) !== null) {
        const inicio = m.index, texto = m[0];
        out.push({
          tipo: 'remover-await',
          descricao: 'await removido na linha ' + fonte.slice(0, inicio).split('\n').length,
          linha: fonte.slice(0, inicio).split('\n').length,
          aplica(f) { return f.slice(0, inicio) + f.slice(inicio + texto.length); },
        });
      }
      return out;
    },
  },
  {
    nome: 'congelar-identidade',
    coletar(fonte) {
      const out = [];
      const pares = [
        ['Date.now\\(\\)', 'Date.now() → 1700000000000', '1700000000000'],
        ['Math\\.random\\(\\)', 'Math.random() → 0.5', '0.5'],
        ['new Date\\(\\)\\.toISOString\\(\\)', 'new Date().toISOString() → fixo', '"2023-11-14T22:13:20.000Z"'],
      ];
      for (const [fonteRe, descricao, troca] of pares) {
        const re = new RegExp(fonteRe, 'g');
        let m;
        while ((m = re.exec(fonte)) !== null) {
          const inicio = m.index, texto = m[0];
          out.push({
            tipo: 'congelar-identidade',
            descricao: descricao + ' (linha ' + fonte.slice(0, inicio).split('\n').length + ')',
            linha: fonte.slice(0, inicio).split('\n').length,
            aplica(f) { return f.slice(0, inicio) + troca + f.slice(inicio + texto.length); },
          });
        }
      }
      return out;
    },
  },
  {
    nome: 'engolir-erro',
    // throw new Error(...) → return null   |   throw x; → return null;
    coletar(fonte) {
      const out1 = [];
      const re = /throw\s+new\s+Error\(/g;
      let m;
      while ((m = re.exec(fonte)) !== null) {
        const inicio = m.index;
        let i = m.index + m[0].length - 1, prof = 0;
        for (; i < fonte.length; i++) {
          if (fonte[i] === '(') prof++;
          else if (fonte[i] === ')') { prof--; if (prof === 0) break; }
        }
        let fim = i + 1;
        if (fonte[fim] === ';') fim++;
        const trecho = fonte.slice(inicio, fim);
        out1.push({
          tipo: 'engolir-erro',
          descricao: 'throw → return null (linha ' + fonte.slice(0, inicio).split('\n').length + ')',
          linha: fonte.slice(0, inicio).split('\n').length,
          aplica(f) { return f.slice(0, inicio) + 'return null;' + f.slice(fim); },
        });
      }
      return out1;
    },
  },
];

// ── Segurança: nunca deixar mutante em disco ─────────────────────────────────
const protegidos = new Map(); // abs → conteúdo original
let limpandoSincrono = false;

function restauraTudo() {
  if (limpandoSincrono) return;
  limpandoSincrono = true;
  for (const [abs, conteudo] of protegidos) {
    try { fs.writeFileSync(abs, conteudo, 'utf8'); } catch (e) { /* melhor esforço */ }
    try { if (fs.existsSync(abs + SUFIXO_BACKUP)) fs.unlinkSync(abs + SUFIXO_BACKUP); } catch (e) {}
  }
  protegidos.clear();
  limpandoSincrono = false;
}

for (const sinal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT']) {
  process.on(sinal, () => {
    restauraTudo();
    console.error('\n⚠ interrompido por ' + sinal + ' — originais restaurados.');
    process.exit(130);
  });
}
process.on('uncaughtException', (e) => { restauraTudo(); console.error('⚠ ' + e.message); process.exit(1); });
process.on('exit', restauraTudo);

function protege(abs, original) {
  if (!protegidos.has(abs)) {
    // backup em disco: se o processo for morto com SIGKILL, a próxima execução recupera
    fs.writeFileSync(abs + SUFIXO_BACKUP, original, 'utf8');
    protegidos.set(abs, original);
  }
}

// recuperação de execução anterior morta sem finally
function recuperaOrfaos(dir) {
  const achados = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(SUFIXO_BACKUP)) continue;
    const abs = path.join(dir, f);
    const alvo = abs.slice(0, -SUFIXO_BACKUP.length);
    const conteudo = fs.readFileSync(abs, 'utf8');
    fs.writeFileSync(alvo, conteudo, 'utf8');
    fs.unlinkSync(abs);
    achados.push(path.relative(RAIZ, alvo));
  }
  return achados;
}

function varreOrfaos() {
  const achados = [];
  const pilha = [RAIZ];
  while (pilha.length) {
    const d = pilha.pop();
    let entradas = [];
    try { entradas = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { continue; }
    for (const e of entradas) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'testes') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) pilha.push(p);
      else if (e.name.endsWith(SUFIXO_BACKUP)) achados.push(p);
    }
  }
  return achados;
}

// ── Mapa: quem cobre o quê ───────────────────────────────────────────────────
function carregaMapa() {
  return JSON.parse(fs.readFileSync(MAPA, 'utf8'));
}

function testesQueCobrem(alvoRel, mapa) {
  const out = [];
  for (const [arq, info] of Object.entries(mapa.testes)) {
    if (info.ehHelper) continue;
    const mods = [].concat(info.modulosRequeridos || [], info.modulosLidosEstaticamente || []);
    if (mods.includes(alvoRel)) out.push(arq);
  }
  return out;
}

function carregaTempos() {
  try { return JSON.parse(fs.readFileSync(TEMPOS, 'utf8')); } catch (e) { return {}; }
}

const FLAGS = { 'navegador-csp.js': ['--experimental-websocket'] };

function rodaTeste(arquivoTeste) {
  const flags = (FLAGS[arquivoTeste] || []).filter(() => typeof WebSocket !== 'function');
  const r = spawnSync(process.execPath, flags.concat([path.join(DIR, arquivoTeste), CHAT]),
    { encoding: 'utf8', timeout: TIMEOUT_TESTE });
  return { status: r.status, saida: String(r.stdout || '') + String(r.stderr || '') };
}

function primeiroDiferente(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
}

function sintaxeOk(codigo, arquivo) {
  try { new vm.Script(codigo, { filename: arquivo }); return true; } catch (e) { return false; }
}

// ── Núcleo: muta um arquivo ──────────────────────────────────────────────────
function mutaArquivo(alvoRel, opcoes, mapa, tempos) {
  const abs = path.join(RAIZ, alvoRel);
  if (!fs.existsSync(abs)) {
    return { arquivo: alvoRel, erro: 'arquivo não existe', mutantes: 0, mortos: 0, vivos: 0, killRate: null };
  }
  const cobremTodos = testesQueCobrem(alvoRel, mapa);
  if (cobremTodos.length === 0) {
    console.log(alvoRel.padEnd(46) + ' SEM COBERTURA MAPEADA — 0 mutantes' + (opcoes.verbose ? '' : ''));
    return { arquivo: alvoRel, semCobertura: true, mutantes: 0, mortos: 0, vivos: 0, killRate: null };
  }

  // ordem: teste mais rápido primeiro (para matar cedo e gastar menos)
  const cobrem = cobremTodos.slice().sort((a, b) => ((tempos[a] && tempos[a].ms) || 5000) - ((tempos[b] && tempos[b].ms) || 5000));
  const lentos = cobrem.filter(t => (tempos[t] && tempos[t].ms) > LENTO_MS);
  const usaveis = opcoes.permitirLentos ? cobrem : cobrem.filter(t => !lentos.includes(t));

  if (usaveis.length === 0) {
    console.log(alvoRel.padEnd(46) + ' SÓ COBERTURA LENTA (' + cobrem.map(t => t + ' ' + (tempos[t] ? tempos[t].ms + 'ms' : '?')).join(', ') + ') — use --permitir-lentos');
    return { arquivo: alvoRel, soLento: true, mutantes: 0, mortos: 0, vivos: 0, killRate: null };
  }

  const original = fs.readFileSync(abs, 'utf8');
  const rand = rng(opcoes.seed);

  // coleta determinística: catálogo na ordem, mutantes por posição
  const todos = [];
  for (const grupo of CATALOGO) {
    for (const m of grupo.coletar(original)) {
      // sítio em comentário não entra: não muda comportamento, é ruído no denominador
      const marcador = m.aplica(original);
      const i = primeiroDiferente(original, marcador);
      if (i >= 0 && dentroDeComentario(original, i)) continue;
      todos.push(m);
    }
  }
  // embaralha com seed — mesma seed, mesma ordem
  for (let i = todos.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [todos[i], todos[j]] = [todos[j], todos[i]];
  }
  const limite = opcoes.max || todos.length;
  const escolhidos = todos.slice(0, limite);

  if (escolhidos.length === 0) {
    console.log(alvoRel.padEnd(46) + ' nenhum sítio mutável no catálogo');
    return { arquivo: alvoRel, mutantes: 0, mortos: 0, vivos: 0, killRate: null };
  }

  protege(abs, original);
  let mortos = 0, vivos = 0, invalidos = 0;
  const detalhes = [];

  try {
    for (const mut of escolhidos) {
      let mutante;
      try { mutante = mut.aplica(original); } catch (e) { invalidos++; continue; }
      if (mutante === original) { invalidos++; continue; }
      if (!sintaxeOk(mutante, alvoRel)) { invalidos++; detalhes.push({ ...mut, invalido: true }); continue; }

      let morto = false, quemMatou = null, pista = null;
      try {
        fs.writeFileSync(abs, mutante, 'utf8');
        for (const t of usaveis) {
          const r = rodaTeste(t);
          if (r.status !== 0) {
            morto = true; quemMatou = t;
            pista = r.saida.split('\n').filter(l => /✘|Error|erro|falh/.test(l)).slice(0, 2).join(' | ').slice(0, 200);
            break;
          }
        }
      } finally {
        // 🔒 SEMPRE — mesmo se o teste explodir
        fs.writeFileSync(abs, original, 'utf8');
      }
      if (morto) mortos++; else vivos++;
      detalhes.push({
        tipo: mut.tipo, descricao: mut.descricao, linha: mut.linha,
        morto, quemMatou, pista,
      });
    }
  } finally {
    fs.writeFileSync(abs, original, 'utf8');
    try { fs.unlinkSync(abs + SUFIXO_BACKUP); } catch (e) {}
    protegidos.delete(abs);
  }

  const validos = mortos + vivos;
  const killRate = validos ? Math.round((mortos / validos) * 100) : null;
  if (fs.readFileSync(abs, 'utf8') !== original) {
    console.error('✘✘ ' + alvoRel + ' NÃO foi restaurado — abortando');
    process.exit(1);
  }
  console.log(alvoRel.padEnd(46) +
    ' mut ' + String(validos).padStart(2) +
    '  mortos ' + String(mortos).padStart(2) +
    '  vivos ' + String(vivos).padStart(2) +
    '  kill ' + (killRate === null ? ' — ' : String(killRate).padStart(3) + '%') +
    '  | testes: ' + usaveis.slice(0, 2).join(',') + (usaveis.length > 2 ? ' +' + (usaveis.length - 2) : ''));
  for (const d of detalhes.filter(x => !x.morto && !x.invalido)) {
    console.log('      VIVO  [' + d.tipo + '] ' + d.descricao);
  }
  return {
    arquivo: alvoRel, mutantes: validos, mortos, vivos, invalidos, killRate,
    testes: usaveis, lentosExcluidos: lentos, detalhes,
  };
}

module.exports = { mutaArquivo, testesQueCobrem };

// ── CLI ──────────────────────────────────────────────────────────────────────
function arg(nome, padrao) {
  const i = process.argv.indexOf('--' + nome);
  return i >= 0 ? process.argv[i + 1] : padrao;
}
function temFlag(nome) { return process.argv.includes('--' + nome); }

function main() {
  const orfaos = varreOrfaos();
  if (orfaos.length) {
    console.log('⚠ backup órfão encontrado — restaurando: ' + orfaos.map(o => path.relative(RAIZ, o)).join(', '));
    recuperaOrfaos(path.dirname(orfaos[0]));
  }

  if (temFlag('limpar')) { console.log('nada a limpar.'); return; }

  // --teste-crash: prova o mecanismo de recuperação. Aplica um mutante e mata o processo
  // com SIGKILL (que nenhum handler pega) — o backup em disco tem de sobreviver.
  if (temFlag('teste-crash')) {
    const alvoC = process.argv.slice(2).filter(a => a.endsWith('.js') && !a.startsWith('--'))[0];
    const absC = path.join(RAIZ, alvoC);
    const origC = fs.readFileSync(absC, 'utf8');
    const sitioC = CATALOGO.find(c => c.nome === 'trocar-limite').coletar(origC)[0];
    protege(absC, origC);
    fs.writeFileSync(absC, sitioC.aplica(origC), 'utf8');
    console.log('mutante aplicado em ' + alvoC + ' (' + sitioC.descricao + ') — matando o processo com SIGKILL');
    process.kill(process.pid, 'SIGKILL');
  }

  // --doutor: prova sanitária do próprio mutador. Injeta UM `>=`→`>` (o mutante do instrutor)
  // no alvo e confere que algum teste mapeado acusa. Se passar, o mutador é falso negativo.
  if (temFlag('doutor')) {
    const alvoD = process.argv.slice(2).filter(a => a.endsWith('.js') && !a.startsWith('--'))[0];
    return doutor(alvoD);
  }

  // --limites <alvo>: varre TODOS os sítios de `>=`/`<=` do alvo e diz quais morrem.
  if (temFlag('limites')) {
    const alvoL = process.argv.slice(2).filter(a => a.endsWith('.js') && !a.startsWith('--'))[0];
    return varreLimites(alvoL);
  }

  const mapa = carregaMapa();
  const tempos = carregaTempos();
  const opcoes = {
    seed: parseInt(arg('seed', '42'), 10),
    max: arg('max') ? parseInt(arg('max'), 10) : 0,
    permitirLentos: temFlag('permitir-lentos'),
    verbose: temFlag('verbose'),
  };

  if (temFlag('todos')) {
    const alvos = new Set();
    for (const info of Object.values(mapa.testes)) {
      for (const m of [].concat(info.modulosRequeridos || [], info.modulosLidosEstaticamente || [])) {
        if (m.endsWith('.js') && !m.startsWith('externo:')) alvos.add(m);
      }
    }
    const lista = [...alvos].sort();
    console.log('MUTADOR — ' + lista.length + ' módulos · seed ' + opcoes.seed +
      ' · max ' + (opcoes.max || 'todos') + ' por módulo · orçamento ' + arg('orcamento', '900') + 's\n');
    const t0 = Date.now();
    const orcamento = parseInt(arg('orcamento', '900'), 10) * 1000;
    const resultados = [];
    for (const alvo of lista) {
      if (Date.now() - t0 > orcamento) { console.log('⏳ orçamento esgotado — ' + resultados.length + '/' + lista.length + ' módulos'); break; }
      const r = mutaArquivo(alvo, opcoes, mapa, tempos);
      if (r) resultados.push(r);
    }
    gravaPlacar(resultados, opcoes, lista.length);
    return;
  }

  const posicional = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const alvo = posicional.find(a => a.endsWith('.js'));
  if (!alvo) {
    console.log('Uso: node tools/testes/mutador.js <arquivo-fonte> [--max N] [--seed N] [--permitir-lentos]');
    console.log('     node tools/testes/mutador.js --todos [--orcamento 900]');
    process.exit(1);
  }
  const r = mutaArquivo(path.relative(RAIZ, path.resolve(RAIZ, alvo)), opcoes, mapa, tempos);
  gravaPlacar([r], opcoes, 1);
}

function varreLimites(alvoRel) {
  const mapa = carregaMapa();
  const tempos = carregaTempos();
  const abs = path.join(RAIZ, alvoRel);
  const original = fs.readFileSync(abs, 'utf8');
  const cobrem = testesQueCobrem(alvoRel, mapa)
    .sort((a, b) => ((tempos[a] && tempos[a].ms) || 5000) - ((tempos[b] && tempos[b].ms) || 5000))
    .filter(t => (tempos[t] && tempos[t].ms) <= LENTO_MS);
  if (!cobrem.length) { console.log(alvoRel + ': sem teste rápido mapeado'); return; }
  const sitios = CATALOGO.find(c => c.nome === 'trocar-limite').coletar(original);
  console.log('LIMITES — ' + alvoRel + ' · ' + sitios.length + ' sítios · testes: ' + cobrem.join(', '));
  protege(abs, original);
  let mortos = 0;
  try {
    for (const s of sitios) {
      const mutante = s.aplica(original);
      let matou = null;
      try {
        fs.writeFileSync(abs, mutante, 'utf8');
        for (const t of cobrem) if (rodaTeste(t).status !== 0) { matou = t; break; }
      } finally { fs.writeFileSync(abs, original, 'utf8'); }
      const linhaTexto = original.split('\n')[s.linha - 1].trim().slice(0, 90);
      if (matou) { mortos++; console.log('  🔪 MORRE  L' + s.linha + ' ' + s.descricao + '  ← ' + matou); }
      else console.log('  ⚪ VIVE   L' + s.linha + ' ' + s.descricao + '  | ' + linhaTexto);
    }
  } finally {
    fs.writeFileSync(abs, original, 'utf8');
    try { fs.unlinkSync(abs + SUFIXO_BACKUP); } catch (e) {}
    protegidos.delete(abs);
  }
  console.log('→ ' + mortos + '/' + sitios.length + ' sítios de limite mortos (' +
    Math.round((mortos / sitios.length) * 100) + '%)' + (feito(original, abs) ? '' : ' ✘ restauração falhou'));
  process.exitCode = 0;
}

function feito(original, abs) { return fs.readFileSync(abs, 'utf8') === original; }

function doutor(alvoRel) {
  const mapa = carregaMapa();
  const tempos = carregaTempos();
  const abs = path.join(RAIZ, alvoRel);
  const original = fs.readFileSync(abs, 'utf8');
  const cobrem = testesQueCobrem(alvoRel, mapa);
  console.log('DOUTOR — alvo ' + alvoRel);
  console.log('testes mapeados que cobrem: ' + (cobrem.join(', ') || 'NENHUM'));

  // baseline: o arquivo ORIGINAL passa? (se não passa, o teste acusa por outro motivo)
  for (const t of cobrem) {
    const r = rodaTeste(t);
    console.log('  baseline ' + t.padEnd(34) + ' rc=' + r.status + ' ' + (tempos[t] ? tempos[t].ms + 'ms' : ''));
  }

  const sitio = CATALOGO.find(c => c.nome === 'trocar-limite').coletar(original);
  if (!sitio.length) { console.log('✘ alvo não tem nenhum >= ou <= — escolha outro módulo'); return; }
  const linhaPedida = parseInt(arg('linha', '0'), 10);
  const escolhido = linhaPedida ? (sitio.find(s => s.linha === linhaPedida) || sitio[0]) : sitio[0];
  const mutante = escolhido.aplica(original);
  console.log('mutante: ' + escolhido.descricao + ' (linha ' + escolhido.linha + ')');

  protege(abs, original);
  let acusou = 0;
  try {
    fs.writeFileSync(abs, mutante, 'utf8');
    for (const t of cobrem) {
      const r = rodaTeste(t);
      if (r.status !== 0) {
        acusou++;
        const pista = r.saida.split('\n').filter(l => /✘|Error|erro|falh/.test(l)).slice(0, 2).join(' | ').slice(0, 220);
        console.log('  🔪 ' + t + ' ACUSOU (rc=' + r.status + '): ' + pista);
      } else {
        console.log('  · ' + t + ' passou (não viu)');
      }
    }
  } finally {
    fs.writeFileSync(abs, original, 'utf8');
    try { fs.unlinkSync(abs + SUFIXO_BACKUP); } catch (e) {}
    protegidos.delete(abs);
  }
  const igual = fs.readFileSync(abs, 'utf8') === original;
  console.log(igual ? '✔ original restaurado (byte a byte idêntico)' : '✘✘ RESTAURAÇÃO FALHOU');
  console.log(acusou ? '\n✔ MUTADOR ACUSA: ' + acusou + '/' + cobrem.length + ' teste(s) mataram o `>=`→`>`'
    : '\n✘ MUTADOR É FALSO NEGATIVO: o `>=`→`>` sobreviveu a todos os testes mapeados');
  process.exitCode = acusou && igual ? 0 : 1;
}

function gravaPlacar(resultados, opcoes, totalAlvos) {
  const comCobertura = resultados.filter(r => r.killRate !== null);
  const semCobertura = resultados.filter(r => r.semCobertura || r.soLento);
  const mutantes = comCobertura.reduce((s, r) => s + r.mutantes, 0);
  const mortos = comCobertura.reduce((s, r) => s + r.mortos, 0);
  const placar = {
    geradoEm: new Date().toISOString(),
    seed: opcoes.seed,
    maxPorModulo: opcoes.max || 'todos',
    alvos: totalAlvos,
    comCobertura: comCobertura.length,
    semCoberturaOuLenta: semCobertura.length,
    mutantes, mortos, vivos: mutantes - mortos,
    killRateGeral: mutantes ? Math.round((mortos / mutantes) * 100) : null,
    resultados,
  };
  fs.writeFileSync(PLACAR, JSON.stringify(placar, null, 2) + '\n');

  console.log('\n── PLACAR (por arquivo, não média) ─────────────────────────────');
  console.log('alvos com cobertura executada: ' + comCobertura.length + ' · sem cobertura/lenta: ' + semCobertura.length +
    ' · mutantes ' + mutantes + ' · mortos ' + mortos + ' · vivos ' + (mutantes - mortos));

  const zero = comCobertura.filter(r => r.killRate === 0).sort((a, b) => b.vivos - a.vivos);
  const parciais = comCobertura.filter(r => r.killRate > 0 && r.killRate < 100).sort((a, b) => a.killRate - b.killRate);
  const cheios = comCobertura.filter(r => r.killRate === 100);
  if (zero.length) {
    console.log('\n🔴 kill 0% (pior risco — a suíte não vê nada):');
    for (const r of zero) console.log('   ' + r.arquivo + ' → ' + r.vivos + ' mutantes vivos');
  }
  if (parciais.length) {
    console.log('\n🟡 kill parcial (fila do ciclo 3):');
    for (const r of parciais) console.log('   ' + r.arquivo + ' → ' + r.killRate + '% (' + r.vivos + ' vivos de ' + r.mutantes + ')');
  }
  if (cheios.length) {
    console.log('\n🟢 kill 100%: ' + cheios.length + ' módulo(s)');
  }
  if (semCobertura.length) {
    console.log('\n⚪ sem cobertura mapeada (achado): ' + semCobertura.length + ' módulo(s)');
  }
  console.log('\nplacar completo em tools/testes/mutador-placar.json');
}

if (require.main === module) main();
