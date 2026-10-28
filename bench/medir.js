/* Mede ANTES (rota fixa, 1 tentativa) × DEPOIS (roteador em cascata) no MESMO banco de 200 itens.
   Uso: node medir.js antes-glm | antes-ovhq397 | depois */
const fs = require('fs');
const path = require('path');
const { Roteador, CATALOGO } = require('../roteador-ia.js');

const arquivo = process.env.BANCO || 'banco200.json';
const banco = JSON.parse(fs.readFileSync(path.join(__dirname, arquivo), 'utf8')).itens;
const modo = process.argv[2] || 'depois';
const CONC = parseInt(process.env.CONC || '3', 10);

const norm = s => String(s).toLowerCase().normalize('NFC');
function acertou(resp, gabs) {
  if (!resp) return false;
  const r = norm(resp);
  for (const g0 of gabs) {
    const g = norm(g0);
    if (/^-?\d+(?:[.,]\d+)?$/.test(g)) {
      const num = g.replace(',', '.');
      const padrao = new RegExp('(?<![\\d.,-])' + num.replace('.', '[.,]') + '(?![\\d])');
      if (padrao.test(r.replace(/r\$/g, ''))) return true;
    } else if (r.includes(g)) return true;
  }
  return false;
}

const rota = id => CATALOGO.find(x => x.id === id);
async function chamarRotaFixa(idRota, pergunta) {
  const r = rota(idRota);
  const url = r.base.replace(/\/$/, '') + '/chat/completions';
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 30000);
  const t0 = Date.now();
  try {
    const resp = await fetch(url, {
      method: 'POST', signal: c.signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: r.modelo, temperature: 0, max_tokens: 400,
        messages: [{ role: 'system', content: 'Responda em uma linha, apenas o resultado pedido. Sem explicação.' },
                   { role: 'user', content: pergunta }] })
    });
    clearTimeout(t);
    const bruto = await resp.text();
    const ms = Date.now() - t0;
    if (resp.status === 429) return { texto: null, erro: 'rate', ms };
    if (!resp.ok) return { texto: null, erro: 'http' + resp.status, ms };
    let d; try { d = JSON.parse(bruto); } catch { return { texto: null, erro: 'json', ms }; }
    const m = d.choices && d.choices[0] && d.choices[0].message;
    if (!m) return { texto: null, erro: 'vazio', ms };
    const texto = (m.content || '').trim() || String(m.reasoning || '').trim();
    return texto ? { texto, ms } : { texto: null, erro: 'vazio', ms };
  } catch (e) {
    clearTimeout(t);
    return { texto: null, erro: e.name === 'AbortError' ? 'timeout' : 'rede', ms: Date.now() - t0 };
  }
}

// ferramenta igual à do roteador, para isolar o efeito do roteamento
const rot = new Roteador();
async function ferramenta(pergunta) {
  const f = await rot._ferramenta(pergunta);
  return f ? { texto: f.texto, rota: f.ferramenta, ferramenta: true, tentativas: 0, ms: 0 } : null;
}

async function resolver(item) {
  if (modo === 'depois' || modo === 'gratis') {
    const out = await rot.responder({ pergunta: item.q, dificuldade: modo === 'gratis' ? 'dificil' : 'dificil' });
    return out.texto ? { ...out, fonte: out.rota } : { texto: null, erro: out.erro, ms: out.ms, tentativas: out.tentativas };
  }
  const f = await ferramenta(item.q);
  if (f) return { ...f, fonte: f.rota };
  const id = modo === 'antes-glm' ? 'glm' : 'ovhq397';
  const r = await chamarRotaFixa(id, item.q);
  return r.texto ? { ...r, fonte: id, tentativas: 1 } : { texto: null, erro: r.erro, ms: r.ms, tentativas: 1 };
}

(async () => {
  const t0 = Date.now();
  const res = new Array(banco.length);
  let idx = 0;
  const workers = Array.from({ length: CONC }, async () => {
    while (idx < banco.length) {
      const i = idx++;
      const it = banco[i];
      const r = await resolver(it);
      res[i] = { id: it.id, tipo: it.tipo, q: it.q, gab: it.g, resp: r.texto ? String(r.texto).slice(0, 200) : '',
                 ok: acertou(r.texto, it.g), erro: r.erro || null, fonte: r.fonte || null,
                 tentativas: r.tentativas ?? 1, ms: r.ms ?? null };
      if ((i + 1) % 25 === 0) process.stderr.write(`  ${i + 1}/${banco.length}\n`);
    }
  });
  await Promise.all(workers);

  const porTipo = {};
  for (const r of res) {
    const t = porTipo[r.tipo] || (porTipo[r.tipo] = { n: 0, ok: 0, semResp: 0, errado: 0 });
    t.n++; if (r.ok) t.ok++; else if (!r.resp) t.semResp++; else t.errado++;
  }
  const resp = res.filter(r => r.resp);
  const lat = res.filter(r => r.ms).map(r => r.ms).sort((a, b) => a - b);
  const err429 = res.filter(r => r.erro === 'rate').length;
  const semResp = res.filter(r => !r.resp).length;
  const acertos = res.filter(r => r.ok).length;
  const errados = resp.length - acertos;

  const sum = {
    modo, total: banco.length, acertos,
    acertoPct: +(100 * acertos / banco.length).toFixed(1),
    semResposta: semResp, semRespostaPct: +(100 * semResp / banco.length).toFixed(1),
    taxa429: err429,
    respondeu: resp.length,
    acertoQuandoResponde: resp.length ? +(100 * acertos / resp.length).toFixed(1) : 0,
    errosDeConteudo: errados,
    latenciaMedianaMs: lat.length ? lat[Math.floor(lat.length / 2)] : null,
    tentativasTotal: res.reduce((a, r) => a + (r.tentativas || 0), 0),
    duracaoS: +((Date.now() - t0) / 1000).toFixed(0),
    porTipo
  };
  fs.writeFileSync(path.join(__dirname, `resultado-${modo}.json`), JSON.stringify({ sum, res }, null, 1));
  console.log(JSON.stringify(sum, null, 1));
})();
