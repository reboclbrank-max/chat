// Medidor de texto aberto: mesma rubrica de forma/termos, não verifica fatos.
// Cada resposta é salva atomicamente ao terminar; uma medição parcial NÃO é placar.
// CONC=1 BANCO_ABERTO=banco-aberto-antes-100.json SAIDA_ABERTO=resultado.json node bench/medir-aberto.js
// RETOMAR_ABERTO=1 ... retoma apenas itens não medidos com os mesmos hashes e concorrência.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { AsyncLocalStorage } = require('async_hooks');
const { avaliar } = require('./avaliar-aberto.js');

function sha(caminho) { return crypto.createHash('sha256').update(fs.readFileSync(caminho)).digest('hex'); }
function resumo(res, previsto, modo) {
  const completo = res.length === previsto;
  const ok = res.filter((x) => x.ok).length;
  const mediana = (nome) => res.length ? res.map((x) => x[nome]).sort((a, b) => a - b)[Math.floor(res.length / 2)] : null;
  return {
    modo, total: res.length, totalPrevisto: previsto, completo, passaram: ok,
    // Não apresentar percentual de um prefixo como resultado da régua inteira.
    pct: completo ? Math.round((ok / res.length) * 1000) / 10 : null,
    medianaPalavras: mediana('palavras'),
    cortados: res.filter((x) => x.falhas.includes('não terminou a frase (provável corte por limite de tokens)')).length,
    curtos: res.filter((x) => x.falhas.some((f) => f.startsWith('curto'))).length,
    faltouFato: res.filter((x) => x.falhas.some((f) => f.startsWith('falta fato'))).length,
    medianaMs: mediana('ms')
  };
}
function salvarAtomico(arquivo, dados) {
  const temporario = arquivo + '.tmp';
  fs.writeFileSync(temporario, JSON.stringify(dados, null, 1) + '\n');
  fs.renameSync(temporario, arquivo);
}
function validarRetomada(dados, meta, banco, modo) {
  if (!dados || !dados.meta || !Array.isArray(dados.res) || !dados.sum) throw new Error('checkpoint inválido');
  for (const campo of ['bancoSha256', 'codigoSha256', 'rubricaSha256', 'concorrencia']) {
    if (dados.meta[campo] !== meta[campo]) throw new Error('retomada recusada: ' + campo + ' mudou');
  }
  if (dados.sum.modo !== modo || dados.sum.totalPrevisto !== banco.length) throw new Error('modo ou tamanho do banco mudou');
  if (dados.meta.invalido) throw new Error('checkpoint marcado como inválido');
  if (dados.sum.completo) throw new Error('régua já está completa; não repetir itens para melhorar placar');
  const ids = new Set();
  for (const linha of dados.res) {
    const item = banco.find((x) => x.id === linha.id);
    if (!item || item.q !== linha.q || ids.has(linha.id)) throw new Error('itens do checkpoint não correspondem ao banco');
    ids.add(linha.id);
  }
  return dados.res.slice();
}

async function executar() {
  const MODO = process.env.MODO === 'antes' ? 'antes' : 'depois';
  const CONC = Number(process.env.CONC || 2);
  if (!Number.isInteger(CONC) || CONC < 1 || CONC > 8) throw new Error('CONC deve ser inteiro entre 1 e 8');
  const caminhoBanco = path.resolve(__dirname, process.env.BANCO_ABERTO || 'banco-aberto.json');
  const caminhoCodigo = path.resolve(__dirname, '..', 'roteador-ia.js');
  const caminhoRubrica = path.resolve(__dirname, 'avaliar-aberto.js');
  const arquivo = path.resolve(__dirname, process.env.SAIDA_ABERTO || ('resultado-aberto-' + MODO + '.json'));
  const banco = JSON.parse(fs.readFileSync(caminhoBanco, 'utf8'));
  if (!Array.isArray(banco) || !banco.length || new Set(banco.map((x) => x.id)).size !== banco.length)
    throw new Error('banco aberto vazio, inválido ou com IDs duplicados');
  const iniciado = new Date().toISOString();
  const metaAtual = { iniciado, terminado: null, banco: path.basename(caminhoBanco), bancoSha256: sha(caminhoBanco),
    codigoSha256: sha(caminhoCodigo), rubricaSha256: sha(caminhoRubrica), concorrencia: CONC,
    janelas: [{ iniciado, terminado: null }], retomadas: 0, invalido: false };
  let meta = metaAtual, res = [];
  if (process.env.RETOMAR_ABERTO === '1' && fs.existsSync(arquivo)) {
    const anterior = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    res = validarRetomada(anterior, metaAtual, banco, MODO);
    meta = { ...anterior.meta, terminado: null, retomadas: (anterior.meta.retomadas || 0) + 1,
      janelas: (anterior.meta.janelas || []).concat([{ iniciado, terminado: null }]) };
    console.log('Retomada: ' + res.length + '/' + banco.length + ' resultados anteriores preservados; nova janela ' + iniciado);
  } else if (fs.existsSync(arquivo)) {
    throw new Error('arquivo de saída já existe; escolha outro nome ou use RETOMAR_ABERTO=1');
  }
  const posicao = new Map(banco.map((it, i) => [it.id, i]));
  function registrar(final) {
    const agora = new Date().toISOString();
    if (sha(caminhoCodigo) !== meta.codigoSha256 || sha(caminhoBanco) !== meta.bancoSha256 || sha(caminhoRubrica) !== meta.rubricaSha256)
      meta.invalido = true;
    if (final) { meta.terminado = agora; meta.janelas[meta.janelas.length - 1].terminado = agora; }
    res.sort((a, b) => posicao.get(a.id) - posicao.get(b.id));
    const sum = resumo(res, banco.length, MODO);
    // Mesmo com todos os IDs, código/banco/rubrica diferentes invalidam a execução.
    if (meta.invalido) { sum.completo = false; sum.pct = null; }
    salvarAtomico(arquivo, { sum, res, meta });
    if (meta.invalido) throw new Error('código, banco ou rubrica mudou durante a execução; não há placar válido');
  }
  registrar(false);
  for (const sig of ['SIGINT', 'SIGTERM']) process.once(sig, () => {
    try { registrar(true); console.error('\nInterrompido: checkpoint parcial preservado.'); }
    catch (e) { console.error('Falha ao preservar checkpoint:', e.message); }
    process.exit(sig === 'SIGINT' ? 130 : 143);
  });

  const { Roteador } = require(caminhoCodigo);
  const r = new Roteador();
  const contexto = new AsyncLocalStorage();
  const chamadaOriginal = r._chamar.bind(r);
  r._chamar = async function (rota, pergunta, timeout, opcoes) {
    const trilha = contexto.getStore(), t0 = Date.now(), instante = new Date().toISOString();
    let saida;
    try { saida = await chamadaOriginal(rota, pergunta, timeout, opcoes); return saida; }
    finally {
      if (trilha) trilha.push({ rota: rota.id, inicio: instante, msParede: Date.now() - t0,
        resultado: saida && saida.erro || (saida && saida.texto ? 'texto' : 'excecao'),
        retryAfterSegundos: saida && saida.espera != null ? saida.espera : null,
        fim: saida && saida.bruto || null });
    }
  };
  const medidos = new Set(res.map((x) => x.id));
  const faltantes = banco.filter((it) => !medidos.has(it.id));
  for (let i = 0; i < faltantes.length; i += CONC) {
    await Promise.all(faltantes.slice(i, i + CONC).map((it) => contexto.run([], async () => {
      const trilha = contexto.getStore(), t0 = Date.now();
      const pedido = MODO === 'antes' ? { pergunta: it.q, tipo: 'curto' } : { pergunta: it.q, tipo: 'aberto' };
      let o;
      try { o = await r.responder(pedido); } catch (e) { o = { texto: null, erro: String(e && e.message) }; }
      const av = avaliar(o && o.texto, it);
      const item = { id: it.id, q: it.q, ok: av.ok, falhas: av.falhas, palavras: av.palavras,
        paragrafos: av.paragrafos, itens: av.itens, nota: o && o.nota, erro: o && o.erro || null,
        ms: Date.now() - t0, rota: o && o.rota || null, tentativasSelecionadas: o && o.tentativas || 0,
        verificacaoFactual: o && o.verificacaoFactual || null, avisoFormato: o && o.avisoFormato || null,
        incompleto: !!(o && o.incompleto), chamadas: trilha, texto: String((o && o.texto) || ''),
        trecho: String((o && o.texto) || '').slice(0, 200), fim: String((o && o.texto) || '').slice(-80) };
      res.push(item);
      registrar(false);
      console.log((item.ok ? '✔' : '✘') + ' #' + String(item.id).padStart(2) + ' ' + String(item.palavras).padStart(4) + 'p '
        + (item.ms + 'ms').padStart(7) + '  ' + (item.ok ? '' : item.falhas.join(' · ').slice(0, 110))
        + ' [' + res.length + '/' + banco.length + ']');
    })));
  }
  registrar(true);
  console.log('\n' + JSON.stringify(resumo(res, banco.length, MODO)));
  console.log('salvo em ' + arquivo);
}
if (require.main === module) executar().catch((erro) => { console.error(erro); process.exitCode = 1; });
module.exports = { resumo, salvarAtomico, validarRetomada };
