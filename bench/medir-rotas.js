// 🔬 MEDIDOR ROTA POR ROTA (rodada 95) — quem é forte de verdade nos itens difíceis?
// Pergunta a mesma bateria para cada rota do catálogo, isolada, e conta acerto — não a média
// do consenso, mas o nome do modelo. É o que permite dizer "o teto grátis é X" com prova.
//
//   node medir-rotas.js                 # rotas fortes e médias (padrão)
//   ROTAS=ultra,ovhq397 node medir-rotas.js
const fs = require('fs');
const path = require('path');
const { CATALOGO } = require(path.resolve(__dirname, '..', 'roteador-ia.js'));
const { acertou } = require('./pontuar.js');
const banco = require('./banco-duro.json').itens;

const pedidas = (process.env.ROTAS || 'gigante2,ultra,ovhq397,ovhq,ovhoss,glm,g4super,polli').split(',').map((s) => s.trim()).filter(Boolean);
const CONC = Number(process.env.CONC || 3);
const TIMEOUT = Number(process.env.TIMEOUT || 45000);
const MAXTOK = Number(process.env.MAXTOK || 600);
const SYS = 'Responda em uma linha, apenas o resultado pedido. Sem explicação, sem repetir a pergunta.';

async function chamar(rota, pergunta) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), TIMEOUT);
  const t0 = Date.now();
  try {
    const r = await fetch(rota.base.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST', signal: c.signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: rota.modelo, temperature: 0, max_tokens: MAXTOK, messages: [{ role: 'system', content: SYS }, { role: 'user', content: pergunta }] })
    });
    clearTimeout(t);
    if (!r.ok) return { erro: 'http ' + r.status, ms: Date.now() - t0 };
    const d = JSON.parse(await r.text());
    const msg = d.choices && d.choices[0] && d.choices[0].message;
    const texto = ((msg && msg.content) || '').trim() || (msg && msg.reasoning ? String(msg.reasoning) : '');
    return texto ? { texto, ms: Date.now() - t0 } : { erro: 'vazio', ms: Date.now() - t0 };
  } catch (e) { clearTimeout(t); return { erro: e.name === 'AbortError' ? 'timeout' : 'rede', ms: Date.now() - t0 }; }
}

(async () => {
  const saida = [];
  for (const id of pedidas) {
    const rota = CATALOGO.find((x) => x.id === id);
    if (!rota) { console.log('rota desconhecida:', id); continue; }
    let i = 0; const res = [];
    const workers = Array.from({ length: CONC }, async () => {
      while (i < banco.length) {
        const it = banco[i++];
        const r = await chamar(rota, it.q);
        res.push({ id: it.id, tipo: it.tipo, ok: r.texto ? acertou(r.texto, it.g, it.alts) : false, erro: r.erro || null, ms: r.ms, resp: (r.texto || '').slice(0, 160) });
      }
    });
    await Promise.all(workers);
    const ok = res.filter((x) => x.ok).length;
    const porTipo = {};
    res.forEach((x) => { porTipo[x.tipo] = porTipo[x.tipo] || { n: 0, ok: 0 }; porTipo[x.tipo].n++; if (x.ok) porTipo[x.tipo].ok++; });
    const linha = { id, nome: rota.nome, classe: rota.classe, acertos: ok, total: res.length, pct: Math.round((ok / res.length) * 1000) / 10,
      erros: res.filter((x) => x.erro).length, medianaMs: res.map((x) => x.ms).sort((a, b) => a - b)[Math.floor(res.length / 2)], porTipo, res };
    saida.push(linha);
    console.log(String(ok + '/' + res.length).padStart(7), (linha.pct + '%').padStart(7), String(linha.medianaMs + 'ms').padStart(8),
      String(linha.erros + ' err').padStart(8), ' ', rota.nome, JSON.stringify(porTipo));
  }
  saida.sort((a, b) => b.pct - a.pct || a.medianaMs - b.medianaMs);
  fs.writeFileSync(path.join(__dirname, 'resultado-rotas-duro.json'), JSON.stringify({ quando: new Date().toISOString(), rotas: saida }, null, 1));
  console.log('\nRanking (acerto nos 30 difíceis, sem chave):');
  saida.forEach((r, i) => console.log(String(i + 1).padStart(2) + '. ' + String(r.pct + '%').padStart(6) + '  ' + String(r.medianaMs + 'ms').padStart(8) + '  ' + r.nome));
})();
