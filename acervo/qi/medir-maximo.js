// Prova ao vivo do "QI máximo" — 31/10/2026, depois dos consertos.
// Mede as três falhas que a auditoria apontou, do jeito que elas aparecem na vida real:
//   1) RAJADA: 12 perguntas com 4 correndo juntas → quantas voltam vazias (antes: 2 em 8).
//   2) ECO:    perguntas com instrução colada no fim → quantas repetem a ordem (antes: 1 em 18).
//   3) MEMÓRIA: conversa de 3 turnos → o chat lembra o que foi dito antes.
'use strict';
const fs = require('fs');
const { Roteador } = require('/home/user/chat-main/roteador-ia.js');

const INSTRUCAO = '\nResponda SOMENTE com o valor pedido, sem explicação.';
const RAJADA = [
  { q: 'Qual é a capital do Canadá?', ok: ['ottawa'] },
  { q: 'Quanto é 47 vezes 13?', ok: ['611'] },
  { q: 'Qual número continua: 5, 10, 20, 40, ?', ok: ['80'] },
  { q: 'Qual é o maior oceano do mundo?', ok: ['pacífico|pacifico'] },
  { q: 'Quanto é 144 dividido por 12?', ok: ['12'] },
  { q: 'Qual é a moeda do México?', ok: ['peso'] },
  { q: 'Quem pintou a Mona Lisa?', ok: ['da vinci|vinci'] },
  { q: 'Quanto é 15% de 240?', ok: ['36'] },
  { q: 'Qual é o plural de "cidadão"?', ok: ['cidadãos|cidadaos'] },
  { q: 'Quantos lados tem um hexágono?', ok: ['6'] },
  { q: 'Qual é o antônimo de "generoso"?', ok: ['egoísta|egoista|mesquinho|avaro|avarento'] },
  { q: 'Em Python, o que vale len("casa")?', ok: ['4'] },
];
const ECO = [
  'Explique em uma frase o que é um buraco negro.',
  'Em uma linha, o que é inflação?',
  'Responda apenas o valor: qual é a raiz quadrada de 400?',
  'Diga só o nome do rio mais extenso do Brasil.',
  'Qual é o coletivo de lobos? Responda somente a palavra.',
  'Em no máximo 6 palavras, o que é entropia?',
];

function corrigir(alternativas, texto) {
  const t = String(texto || '').toLowerCase();
  if (!t.trim()) return false;
  return alternativas.some((alt) => alt.split('|').some((a) => {
    if (/^\d+$/.test(a)) return new RegExp('(^|[^\\d])' + a + '([^\\d]|$)').test(t);
    return t.includes(a);
  }));
}

(async () => {
  const r = new Roteador({ amostrasAberto: 1 });
  const saida = { quando: new Date().toISOString() };

  console.log('== 1. RAJADA (4 concorrentes)');
  const res1 = [];
  let i = 0;
  async function w() {
    while (i < RAJADA.length) {
      const item = RAJADA[i++];
      const t0 = Date.now();
      let o = null;
      try { o = await r.responder({ pergunta: item.q + INSTRUCAO, tipo: 'curto' }); } catch (e) { o = { texto: null, erro: e.message }; }
      const texto = String((o && o.texto) || '');
      const vazio = !texto.trim();
      const ok = corrigir(item.ok, texto);
      res1.push({ q: item.q, ok, vazio, resgate: !!(o && o.resgate), ms: Date.now() - t0,
        rota: (o && o.rota) || null, texto: texto.slice(0, 90), erro: (o && o.erro) || null });
      console.log((vazio ? 'VAZIO' : (ok ? '✔' : '✘')) .padEnd(6) + ' ' + String(Date.now() - t0).padStart(6) + 'ms ' +
        String((o && o.rota) || '-').padEnd(12) + ' ' + texto.replace(/\n/g, ' ').slice(0, 55));
    }
  }
  await Promise.all(Array.from({ length: 4 }, w));
  saida.rajada = {
    total: res1.length,
    vazias: res1.filter((x) => x.vazio).length,
    certas: res1.filter((x) => x.ok).length,
    resgates: res1.filter((x) => x.resgate).length,
    medianaMs: res1.map((x) => x.ms).sort((a, b) => a - b)[Math.floor(res1.length / 2)],
    itens: res1,
  };

  console.log('\n== 2. ECO (instrução colada no fim)');
  const res2 = [];
  for (const q of ECO) {
    const t0 = Date.now();
    let o = null;
    try { o = await r.responder({ pergunta: q, tipo: 'curto' }); } catch (e) { o = { texto: null }; }
    const texto = String((o && o.texto) || '');
    const eco = !!o && (o.ecoCortado || o.recomeco);
    res2.push({ q, texto: texto.slice(0, 120), vazio: !texto.trim(), recomeco: !!(o && o.recomeco),
      ecoCortado: !!(o && o.ecoCortado), ms: Date.now() - t0, rota: (o && o.rota) || null });
    console.log((texto.trim() ? '✔' : 'VAZIO') + ' ' + String(Date.now() - t0).padStart(6) + 'ms ' +
      (o && o.recomeco ? '[recomeço] ' : '') + texto.replace(/\n/g, ' ').slice(0, 60));
  }
  saida.eco = {
    total: res2.length,
    vazias: res2.filter((x) => x.vazio).length,
    recomecos: res2.filter((x) => x.recomeco).length,
    ecosCortados: res2.filter((x) => x.ecoCortado).length,
    itens: res2,
  };

  console.log('\n== 3. MEMÓRIA (3 turnos)');
  const historico = [{ role: 'user', content: 'meu nome é Zeca e eu moro em Tobias Barreto, em Sergipe' }];
  let t0 = Date.now();
  const a = await r.responder({ pergunta: 'prazer, guarde meu nome e minha cidade.', tipo: 'curto', historico });
  historico.push({ role: 'user', content: 'prazer, guarde meu nome e minha cidade.' });
  historico.push({ role: 'assistant', content: String(a.texto || '') });
  t0 = Date.now();
  const b = await r.responder({ pergunta: 'em que cidade eu moro? Responda só a cidade.', tipo: 'curto', historico });
  const lembra = /tobias/i.test(String(b.texto || ''));
  console.log('  turno 2 →', String(b.texto || '(vazio)').replace(/\n/g, ' ').slice(0, 90), '| lembra?', lembra,
    '|', Date.now() - t0, 'ms');
  historico.push({ role: 'user', content: 'em que cidade eu moro? Responda só a cidade.' });
  historico.push({ role: 'assistant', content: String(b.texto || '') });
  const c = await r.responder({ pergunta: 'e qual é o meu nome? Responda só o nome.', tipo: 'curto', historico });
  const lembraNome = /zeca/i.test(String(c.texto || ''));
  console.log('  turno 3 →', String(c.texto || '(vazio)').replace(/\n/g, ' ').slice(0, 90), '| lembra?', lembraNome);
  saida.memoria = { cidade: String(b.texto || ''), lembraCidade: lembra, nome: String(c.texto || ''), lembraNome };

  fs.writeFileSync('/home/user/qi-maximo.json', JSON.stringify(saida, null, 1));
  console.log('\n== RESUMO');
  console.log('rajada: ' + (res1.length - saida.rajada.vazias) + '/' + res1.length + ' com texto · ' +
    saida.rajada.certas + '/' + res1.length + ' certas · resgates ' + saida.rajada.resgates +
    ' · mediana ' + saida.rajada.medianaMs + ' ms');
  console.log('eco: ' + (res2.length - saida.eco.vazias) + '/' + res2.length + ' com texto · recomeços ' +
    saida.eco.recomecos + ' · ecos cortados ' + saida.eco.ecosCortados);
  console.log('memória: cidade ' + (lembra ? 'LEMBROU' : 'esqueceu') + ' · nome ' + (lembraNome ? 'LEMBROU' : 'esqueceu'));
})();
