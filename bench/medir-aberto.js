// 📝 MEDIDOR DE TEXTO ABERTO (rodada 94) — rubrica que o código consegue conferir.
// Não existe juiz humano aqui e não vou fingir que existe: o que é medido é o que dá para
// verificar por máquina — tamanho, número de parágrafos/itens, presença dos fatos exigidos pela
// pergunta, ausência de preâmbulo de robô e se o texto FECHOU (não acabou no meio da frase).
//
//   node medir-aberto.js gratis            # caminho novo (tipo 'aberto': até 1400 tokens)
//   MODO=antes node medir-aberto.js gratis # como era antes (consenso de 3, 400 tokens)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { avaliar } = require('./avaliar-aberto.js');
const { Roteador, internos } = require(path.resolve(__dirname, '..', 'roteador-ia.js'));

const MODO = process.env.MODO === 'antes' ? 'antes' : 'depois';
const CONC = Number(process.env.CONC || 2);
const caminhoBanco = path.resolve(__dirname, process.env.BANCO_ABERTO || 'banco-aberto.json');
const banco = JSON.parse(fs.readFileSync(caminhoBanco, 'utf8'));
if (!Array.isArray(banco) || !banco.length) throw new Error('banco aberto vazio ou inválido');
const startedAt = new Date().toISOString();
function sha(caminho) { return crypto.createHash('sha256').update(fs.readFileSync(caminho)).digest('hex'); }

(async () => {
  const r = new Roteador();
  const res = [];
  for (let i = 0; i < banco.length; i += CONC) {
    const bloco = banco.slice(i, i + CONC);
    const feitos = await Promise.all(bloco.map(async (it) => {
      const t0 = Date.now();
      const pedido = MODO === 'antes' ? { pergunta: it.q, tipo: 'curto' } : { pergunta: it.q, tipo: 'aberto' };
      let o;
      try { o = await r.responder(pedido); } catch (e) { o = { texto: null, erro: String(e && e.message) }; }
      const av = avaliar(o && o.texto, it);
      return { id: it.id, q: it.q, ok: av.ok, falhas: av.falhas, palavras: av.palavras, paragrafos: av.paragrafos,
               itens: av.itens, nota: o && o.nota, erro: o && o.erro || null, ms: Date.now() - t0,
               texto: String((o && o.texto) || ''), trecho: String((o && o.texto) || '').slice(0, 200),
               fim: String((o && o.texto) || '').slice(-80) };
    }));
    feitos.forEach((f) => {
      res.push(f);
      console.log((f.ok ? '✔' : '✘') + ' #' + String(f.id).padStart(2) + ' ' + String(f.palavras).padStart(4) + 'p '
        + (f.ms + 'ms').padStart(7) + '  ' + (f.ok ? '' : f.falhas.join(' · ').slice(0, 110)));
    });
  }
  const ok = res.filter((x) => x.ok).length;
  const sum = {
    modo: MODO, total: res.length, passaram: ok, pct: Math.round((ok / res.length) * 1000) / 10,
    medianaPalavras: res.map((x) => x.palavras).sort((a, b) => a - b)[Math.floor(res.length / 2)],
    cortados: res.filter((x) => x.falhas.includes('não terminou a frase (provável corte por limite de tokens)')).length,
    curtos: res.filter((x) => x.falhas.some((f) => f.startsWith('curto'))).length,
    faltouFato: res.filter((x) => x.falhas.some((f) => f.startsWith('falta fato'))).length,
    medianaMs: res.map((x) => x.ms).sort((a, b) => a - b)[Math.floor(res.length / 2)]
  };
  const arquivo = path.resolve(__dirname, process.env.SAIDA_ABERTO || ('resultado-aberto-' + MODO + '.json'));
  const meta = { iniciado: startedAt, terminado: new Date().toISOString(), banco: path.basename(caminhoBanco),
    bancoSha256: sha(caminhoBanco), codigoSha256: sha(path.resolve(__dirname, '..', 'roteador-ia.js')),
    rubricaSha256: sha(path.resolve(__dirname, 'avaliar-aberto.js')), concorrencia: CONC };
  fs.writeFileSync(arquivo, JSON.stringify({ sum, res, meta }, null, 1));
  console.log('\n' + JSON.stringify(sum));
  console.log('salvo em ' + arquivo);
})();
