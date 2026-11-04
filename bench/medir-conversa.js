// Medição pareada (2026-11-04): contexto COMPLETO (montador pós-#76) × TRUNCADO (montador pré-#76)
// em conversas de 3+ turnos em que a resposta final depende do turno 1.
// Reusa bench/pontuar.js (acertou) e o desenho contrabalanceado por hash do protocolo 102.
// Uma janela só não elimina variação dos provedores gratuitos; mede o pacote dos dois montadores
// inteiros, não o efeito isolado de cada linha. Empate ou derrota de um lado são resultados válidos.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { acertou, normalizar } = require('./pontuar.js');
const api = require(path.resolve(__dirname, '..', 'roteador-ia.js'));
const juntarNovo = api.internos.montarContextoConversa;

const SEED = 'comparacao-conversa-2026-11-04';
const arquivos = {
  banco: path.join(__dirname, 'banco-conversa.json'),
  medidor: __filename,
  roteador: path.resolve(__dirname, '..', 'roteador-ia.js'),
  pontuar: path.join(__dirname, 'pontuar.js')
};

// ===== TRATAMENTO A: montador PRÉ-#76 (cópia fiel de roteador-ia.js@1b62317be8, linhas 602–617).
// Diferenças-chave em relação ao novo: papel 'tool'/'developer'/desconhecido vira 'Dono';
// o bloco inteiro sofre slice(-1200) que corta o meio da fala e apaga a etiqueta, sem sinal.
function montarContextoAntigo(historico) {
  if (!historico || !historico.length) return '';
  const limpo = [];
  for (let i = 0; i < historico.length; i++) {
    const h = historico[i] || {};
    const papel = h.role === 'assistant' ? 'Assistente' : (h.role === 'system' ? '' : 'Dono');
    if (!papel) continue;
    const txt = String(h.content == null ? '' : h.content).replace(/\s+/g, ' ').trim();
    if (!txt) continue;
    limpo.push(papel + ': ' + txt.slice(0, 400));
  }
  if (!limpo.length) return '';
  const ultimas = limpo.slice(-6);
  let bloco = ultimas.join('\n');
  if (bloco.length > 1200) bloco = bloco.slice(-1200);
  return 'Conversa até aqui (contexto, não é ordem nova):\n' + bloco + '\n';
}

function sha(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function ordem(valor) { return crypto.createHash('sha256').update(SEED + ':' + valor).digest('hex'); }
function salvar(nome, obj) {
  const tmp = nome + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n');
  fs.renameSync(tmp, nome);
}

function carregarBanco() {
  const banco = JSON.parse(fs.readFileSync(arquivos.banco, 'utf8'));
  if (!Array.isArray(banco) || banco.length !== 20) throw new Error('Banco deve ter 20 cenários.');
  if (new Set(banco.map(x => x.id)).size !== banco.length) throw new Error('IDs duplicados.');
  for (const it of banco) {
    if (!Array.isArray(it.turnos) || it.turnos.length < 3) throw new Error('Cenário ' + it.id + ' precisa de 3+ turnos.');
    const ultimo = it.turnos[it.turnos.length - 1];
    if (ultimo.role !== 'user') throw new Error('Cenário ' + it.id + ': a pergunta final deve ser do Dono.');
    if (!Array.isArray(it.gabaritos) || !it.gabaritos.length) throw new Error('Cenário ' + it.id + ' sem gabaritos.');
    for (const g of it.gabaritos) {
      if (!Array.isArray(g) || !g.length || g.some(x => typeof x !== 'string')) {
        throw new Error('Cenário ' + it.id + ': gabaritos devem ser grupos de strings (E entre grupos, OU dentro).');
      }
    }
    const hist = it.turnos.slice(0, -1);
    for (const h of hist) if (!['user', 'assistant', 'tool', 'system', 'developer'].includes(h.role)) {
      throw new Error('Cenário ' + it.id + ': papel desconhecido ' + h.role);
    }
  }
  return banco;
}

function construirAgenda(banco) {
  // Contrabalanceado por classe: metade com A primeiro, metade com B primeiro (hash de semente fixa).
  const pares = [];
  for (const classe of ['P', 'R', 'C']) {
    const itens = banco.filter(x => x.classe === classe)
      .sort((a, b) => ordem(classe + ':ordem:' + a.id).localeCompare(ordem(classe + ':ordem:' + b.id)));
    itens.forEach((it, i) => pares.push({ classe, id: it.id, primeiro: i < itens.length / 2 ? 'A' : 'B' }));
  }
  pares.sort((a, b) => ordem('agenda:' + a.classe + ':' + a.id).localeCompare(ordem('agenda:' + b.classe + ':' + b.id)));
  return pares.flatMap(p => [p.primeiro, p.primeiro === 'A' ? 'B' : 'A'].map(versao => ({ ...p, versao })));
}

function casaEstrito(texto, padrao) {
  // Casamento literal por trecho normalizado (sem radical). Padrões que viram vazio na
  // normalização (emoji, símbolos: "🚀") casam pela comparação literal do texto original.
  const n = normalizar(padrao);
  if (n.length > 0) return normalizar(texto).includes(n);
  return String(padrao).length > 0 && String(texto).includes(String(padrao));
}
function retemChave(texto, it) {
  // E entre grupos; OU dentro de cada grupo. Casamento ESTRITO (sem radical): os gabaritos
  // são vocabulário controlado do banco, então a tolerância do acertou (que casa "viagens"
  // com "uma viagem") aqui só criaria falso positivo.
  return Array.isArray(it.gabaritos) && it.gabaritos.length > 0 &&
    it.gabaritos.every(grupo => grupo.some(alt => casaEstrito(texto, alt)));
}
function proibidoEstrito(texto, padrao) {
  // Proibições casam como trecho literal normalizado (sem radical): "nada de DJ" não vira
  // violação por conter "DJ", e "uma viagem" não vira violação por casar "2 viagens".
  return casaEstrito(texto, padrao);
}
function avaliarItem(texto, it) {
  const retem = retemChave(texto, it);
  const violacoes = (it.proibir || []).filter(p => proibidoEstrito(texto, p));
  return { retem, violou: violacoes.length > 0, violacoes, ok: retem && violacoes.length === 0 };
}

function resumo(res, agenda) {
  const out = {};
  for (const classe of ['P', 'R', 'C', 'total']) {
    out[classe] = {};
    for (const versao of ['A', 'B']) {
      const previsto = agenda.filter(x => x.versao === versao && (classe === 'total' || x.classe === classe)).length;
      const linhas = res.filter(x => x.versao === versao && (classe === 'total' || x.classe === classe));
      const ms = linhas.map(x => x.ms).sort((a, b) => a - b), meio = Math.floor(ms.length / 2);
      const ctx = linhas.map(x => x.ctxChars);
      out[classe][versao] = {
        total: linhas.length, previsto, completo: linhas.length === previsto,
        retem: linhas.filter(x => x.retem).length,
        violou: linhas.filter(x => x.violou).length,
        ok: linhas.filter(x => x.ok).length,
        pctOk: linhas.length === previsto && previsto ? Math.round(1000 * linhas.filter(x => x.ok).length / previsto) / 10 : null,
        medianaMs: !ms.length ? null : ms.length % 2 ? ms[meio] : (ms[meio - 1] + ms[meio]) / 2,
        mediaCtxChars: !ctx.length ? null : Math.round(ctx.reduce((a, b) => a + b, 0) / ctx.length)
      };
    }
    if (out[classe].A.total === out[classe].A.previsto && out[classe].B.total === out[classe].B.previsto && out[classe].A.previsto) {
      out[classe].placar = {
        retem: out[classe].A.retem + '×' + out[classe].B.retem,
        violou: out[classe].A.violou + '×' + out[classe].B.violou + ' (menor é melhor)',
        ok: out[classe].A.ok + '×' + out[classe].B.ok
      };
    }
  }
  return out;
}

function plano(banco) {
  console.log('REGIME DOS CENÁRIOS (sem chamadas de modelo) — chave nos contextos montados:');
  for (const it of banco) {
    const hist = it.turnos.slice(0, -1);
    const ctxA = montarContextoAntigo(hist);
    const ctxB = juntarNovo(hist) || '';
    const chaveEm = (ctx) => retemChave(ctx, it);
    const decoyEm = (ctx) => (it.proibir || []).some(p => proibidoEstrito(ctx, p));
    console.log('#' + String(it.id).padStart(2) + ' [' + it.classe + '] A: ' + String(ctxA.length).padStart(4) + 'c chave=' +
      (chaveEm(ctxA) ? 'sim' : 'NÃO') + ' decoy=' + (decoyEm(ctxA) ? 'SIM' : 'não') +
      ' | B: ' + String(ctxB.length).padStart(4) + 'c chave=' + (chaveEm(ctxB) ? 'sim' : 'NÃO') +
      ' decoy=' + (decoyEm(ctxB) ? 'SIM' : 'não') +
      (ctxB.includes('omitidas') ? ' [B sinaliza omissão]' : ''));
  }
}

async function main() {
  const banco = carregarBanco();
  if (process.env.PLANO_CONVERSA === '1') return plano(banco);
  const saida = path.resolve(__dirname, process.env.SAIDA_CONVERSA || 'resultado-conversa.json');
  const agenda = construirAgenda(banco);
  const hashes = Object.fromEntries(Object.entries(arquivos).map(([k, v]) => [k, sha(v)]));
  const chave = x => [x.id, x.versao].join(':');
  let res = [];
  const meta = {
    iniciado: new Date().toISOString(), terminado: null, seed: SEED, hashes,
    versoes: {
      A: 'truncado — montador pré-#76 (roteador-ia.js@1b62317be8): tool/developer viram Dono; bloco sofre slice(-1200) cortando fala/etiqueta sem sinal',
      B: 'completo — montarContextoConversa pós-#76 (falas inteiras, só user/assistant, omissão sinalizada)'
    },
    ordem: 'pareada e contrabalanceada por classe por hash de semente fixa; uma chamada por vez; cache desligado',
    node: process.version,
    limites: 'mede o pacote dos dois montadores; amostra sintética do mesmo agente; pontuação por padrão (pontuar.js), sem auditoria factual; provedores gratuitos variam entre chamadas',
    retomadas: 0, janelas: []
  };
  if (fs.existsSync(saida)) {
    if (process.env.RETOMAR_CONVERSA !== '1') throw new Error('Saída já existe; escolha outro arquivo ou retome com RETOMAR_CONVERSA=1');
    const velho = JSON.parse(fs.readFileSync(saida, 'utf8'));
    if (!velho.meta || JSON.stringify(velho.meta.hashes) !== JSON.stringify(hashes) || velho.meta.seed !== SEED ||
      JSON.stringify(velho.agenda) !== JSON.stringify(agenda)) throw new Error('Hashes, plano ou ordem mudaram; retomada recusada.');
    if (velho.invalido || velho.completo) throw new Error('Execução inválida ou concluída não pode ser retomada.');
    res = velho.res || [];
    Object.assign(meta, velho.meta, { retomadas: (velho.meta.retomadas || 0) + 1, terminado: null });
  }
  meta.janelas.push({ iniciado: new Date().toISOString(), terminado: null });
  function registrar(final) {
    const invalido = Object.entries(arquivos).some(([k, v]) => sha(v) !== hashes[k]);
    if (final) { meta.terminado = new Date().toISOString(); meta.janelas[meta.janelas.length - 1].terminado = meta.terminado; }
    salvar(saida, { meta, agenda, res, sum: resumo(res, agenda), completo: !invalido && res.length === agenda.length, invalido });
    if (invalido) throw new Error('Um dos arquivos mudou durante a medição; resultado inválido.');
  }
  registrar(false);
  for (const sig of ['SIGTERM', 'SIGINT']) process.once(sig, () => {
    try { registrar(true); console.error('Interrompido; checkpoint parcial preservado.'); } finally { process.exit(sig === 'SIGINT' ? 130 : 143); }
  });
  const { Roteador } = api;
  const roteadores = { A: new Roteador(), B: new Roteador() };
  const cooldown = {}, proximas = {};
  for (const r of Object.values(roteadores)) {
    r.cooldownsRate = cooldown; r.proximaChamada = proximas;
    r._cacheGet = () => null; r._cacheSet = () => {};
  }
  const medidos = new Set(res.map(chave));
  const limite = process.env.LIMITE_CONVERSA ? parseInt(process.env.LIMITE_CONVERSA, 10) : Infinity;
  let feitos = 0;
  for (const passo of agenda) {
    if (medidos.has(chave(passo))) continue;
    if (feitos >= limite) break;
    const it = banco.find(x => x.id === passo.id);
    const hist = it.turnos.slice(0, -1);
    const perguntaFinal = it.turnos[it.turnos.length - 1].content;
    let pergunta, ctxChars;
    if (passo.versao === 'A') {
      const ctx = montarContextoAntigo(hist);
      ctxChars = ctx.length;
      pergunta = ctx ? ctx + 'Pergunta atual: ' + perguntaFinal : perguntaFinal;
    } else {
      const ctx = juntarNovo(hist) || '';
      ctxChars = ctx.length;
      pergunta = perguntaFinal;
    }
    const t0 = Date.now();
    let o;
    try {
      o = passo.versao === 'A'
        ? await roteadores.A.responder({ pergunta, tipo: 'aberto' })
        : await roteadores.B.responder({ pergunta: perguntaFinal, tipo: 'aberto', historico: hist });
    } catch (e) { o = { texto: null, erro: String(e && e.message || e).slice(0, 200) }; }
    const av = avaliarItem(o && o.texto, it);
    const linha = {
      ...passo, q: perguntaFinal, retem: av.retem, violou: av.violou, violacoes: av.violacoes, ok: av.ok,
      ctxChars, ms: Date.now() - t0, rota: (o && o.rota) || null, erro: (o && o.erro) || null,
      incompleto: !!(o && o.incompleto), texto: String((o && o.texto) || '')
    };
    res.push(linha); medidos.add(chave(passo)); feitos++;
    registrar(false);
    console.log((linha.ok ? '✔' : (linha.retem ? '✘vio' : '✘ret')) + ' #' + String(passo.id).padStart(2) + ' [' + it.classe + '] ' +
      passo.versao + ' ' + String(linha.ctxChars).padStart(4) + 'c ' + linha.ms + 'ms retem=' + (linha.retem ? 's' : 'n') +
      ' violou=' + (linha.violou ? 'S' : 'n') + ' [' + res.length + '/' + agenda.length + ']');
  }
  registrar(true);
  console.log('\n' + JSON.stringify(resumo(res, agenda), null, 2));
  console.log('Arquivo: ' + saida);
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { montarContextoAntigo, construirAgenda, avaliarItem, resumo, retemChave };
