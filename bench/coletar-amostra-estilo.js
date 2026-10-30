// Coleta três respostas de gêneros diferentes para leitura qualitativa.
// Não pontua: o gerador e nenhum contador automático são juízes literários validados.
// Uso: node bench/coletar-amostra-estilo.js
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Roteador } = require('../roteador-ia.js');
const bancoArquivo = path.join(__dirname, 'banco-estilo-amostra-100.json');
const banco = JSON.parse(fs.readFileSync(bancoArquivo, 'utf8'));
const saida = path.resolve(__dirname, process.env.SAIDA_ESTILO || 'resultado-estilo-amostra-100.json');
(async () => {
  const r = new Roteador();
  const res = [];
  const iniciado = new Date().toISOString();
  for (const item of banco) {
    const t0 = Date.now();
    let resposta;
    try { resposta = await r.responder({ pergunta: item.q, tipo: 'aberto', semFerramenta: true }); }
    catch (e) { resposta = { erro: String(e && e.message || e) }; }
    res.push({ ...item, texto: String(resposta && resposta.texto || ''), rota: resposta && resposta.rota || null,
      erro: resposta && resposta.erro || null, ms: Date.now() - t0 });
    console.log(item.id + ' → ' + (res[res.length - 1].texto ? 'resposta coletada' : 'sem resposta') +
      ', ' + res[res.length - 1].ms + ' ms');
  }
  const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  const meta = { iniciado, terminado: new Date().toISOString(), codigoSha256: sha(path.join(__dirname, '..', 'roteador-ia.js')),
    bancoSha256: sha(bancoArquivo), nota: 'Amostra pequena; coletar não equivale a avaliar qualidade.' };
  fs.writeFileSync(saida, JSON.stringify({ meta, res }, null, 2));
  console.log('salvo em ' + saida);
})().catch((e) => { console.error(e); process.exitCode = 1; });
