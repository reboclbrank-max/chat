// Verifica itens específicos de um banco pela MESMA rubrica do medidor — serve para conferir
// correções item a item sem refazer a régua inteira (útil quando a cota gratuita está apertada).
//   node bench/verificar-itens.js aberto 4,5,6
//   node bench/verificar-itens.js visao 1,9
const fs = require('fs');
const path = require('path');
const { Roteador } = require(path.resolve(__dirname, '..', 'roteador-ia.js'));
const { acertou } = require('./pontuar.js');

const qual = process.argv[2] || 'aberto';
const ids = (process.argv[3] || '').split(',').map(Number).filter(Boolean);
const banco = require('./banco-' + qual + '.json');

function avaliar(texto, it) {
  const t = String(texto || '');
  const falhas = [];
  const palavras = t.split(/\s+/).filter(Boolean).length;
  const paragrafos = t.split(/\n+/).filter((p) => p.trim().length > 0).length;
  const itens = (t.match(/^\s*(?:[-*•]|\d+[.)])\s+\S/gm) || []).length;
  if (!t.trim()) return { ok: false, falhas: ['vazio'], palavras: 0 };
  if (it.minPalavras && palavras < it.minPalavras) falhas.push('curto (' + palavras + '<' + it.minPalavras + ')');
  if (it.maxPalavras && palavras > it.maxPalavras) falhas.push('longo (' + palavras + '>' + it.maxPalavras + ')');
  if (it.paragrafos && paragrafos < it.paragrafos) falhas.push('parágrafos (' + paragrafos + '<' + it.paragrafos + ')');
  if (it.itens && itens < it.itens) falhas.push('itens (' + itens + '<' + it.itens + ')');
  (it.contem || []).forEach((p, i) => { if (!new RegExp(p, 'i').test(t)) falhas.push('falta fato #' + (i + 1) + ' (' + p.split('|')[0] + ')'); });
  if (/como (um )?modelo de linguagem|n[ãa]o posso (te )?ajudar/i.test(t)) falhas.push('meta-resposta');
  if (!/[.!?…"”)]\s*$/.test(t.trim())) falhas.push('não terminou a frase');
  return { ok: falhas.length === 0, falhas, palavras, paragrafos, itens };
}

(async () => {
  const r = new Roteador();
  for (const it of banco) {
    if (ids.length && !ids.includes(it.id)) continue;
    let o;
    if (qual === 'visao') {
      const img = 'data:image/png;base64,' +
        fs.readFileSync(path.join(__dirname, 'visao', it.arq)).toString('base64');
      o = await r.responder({ pergunta: it.q, imagem: img });
      const ok = o && o.texto && acertou(o.texto, it.g, null, {});
      console.log((ok ? '✔' : '✘') + ' #' + String(it.id).padStart(2) + '  gab=' + it.g.join('|') +
        '  resp=' + JSON.stringify(String((o && o.texto) || '').slice(0, 60)));
      continue;
    }
    o = await r.responder({ pergunta: it.q, tipo: 'aberto' });
    const av = avaliar(o && o.texto, it);
    console.log((av.ok ? '✔' : '✘') + ' #' + String(it.id).padStart(2) + ' ' + String(av.palavras).padStart(4) + 'p ' +
      'rota=' + String((o && o.rota) || '-').padEnd(11) + (av.ok ? '' : av.falhas.join(' · ')));
    if (!av.ok) console.log('    fim: ' + JSON.stringify(String((o && o.texto) || '').slice(-90)));
  }
})();
