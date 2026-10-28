// 📝 MEDIDOR DE TEXTO ABERTO (rodada 94) — rubrica que o código consegue conferir.
// Não existe juiz humano aqui e não vou fingir que existe: o que é medido é o que dá para
// verificar por máquina — tamanho, número de parágrafos/itens, presença dos fatos exigidos pela
// pergunta, ausência de preâmbulo de robô e se o texto FECHOU (não acabou no meio da frase).
//
//   node medir-aberto.js gratis            # caminho novo (tipo 'aberto': até 1400 tokens)
//   MODO=antes node medir-aberto.js gratis # como era antes (consenso de 3, 400 tokens)
const fs = require('fs');
const path = require('path');
const { Roteador, internos } = require(path.resolve(__dirname, '..', 'roteador-ia.js'));

const MODO = process.env.MODO === 'antes' ? 'antes' : 'depois';
const CONC = Number(process.env.CONC || 2);
const banco = require('./banco-aberto.json');

function avaliar(texto, it) {
  const t = String(texto || '');
  const falhas = [];
  const palavras = t.split(/\s+/).filter(Boolean).length;
  const paragrafos = t.split(/\n+/).filter((p) => p.trim().length > 0).length;
  const itens = (t.match(/^\s*(?:[-*•]|\d+[.)])\s+\S/gm) || []).length;

  if (!t.trim()) return { ok: false, falhas: ['vazio'], palavras: 0, paragrafos: 0, itens: 0 };
  if (it.minPalavras && palavras < it.minPalavras) falhas.push('curto (' + palavras + '<' + it.minPalavras + ')');
  if (it.maxPalavras && palavras > it.maxPalavras) falhas.push('longo (' + palavras + '>' + it.maxPalavras + ')');
  if (it.paragrafos && paragrafos < it.paragrafos) falhas.push('parágrafos (' + paragrafos + '<' + it.paragrafos + ')');
  if (it.itens && itens < it.itens) falhas.push('itens (' + itens + '<' + it.itens + ')');
  (it.contem || []).forEach((padrao, i) => {
    if (!new RegExp(padrao, 'i').test(t)) falhas.push('falta fato #' + (i + 1) + ' (' + padrao.split('|')[0] + ')');
  });
  if (/como (um )?modelo de linguagem|n[ãa]o posso (te )?ajudar|desculpe, mas/i.test(t)) falhas.push('meta-resposta');
  if (/^\s*(claro|certamente|com certeza|aqui est[áa]|segue)/i.test(t)) falhas.push('preâmbulo');
  // fechou o texto? terminou em pontuação de fim (aceita aspas/fecha-parênteses depois)
  if (!/[.!?…"”)]\s*$/.test(t.trim())) falhas.push('não terminou a frase (provável corte por limite de tokens)');
  return { ok: falhas.length === 0, falhas, palavras, paragrafos, itens };
}

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
  const arquivo = path.join(__dirname, 'resultado-aberto-' + MODO + '.json');
  fs.writeFileSync(arquivo, JSON.stringify({ sum, res }, null, 1));
  console.log('\n' + JSON.stringify(sum));
  console.log('salvo em ' + arquivo);
})();
