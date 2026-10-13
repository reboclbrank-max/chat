// 🧠 EVOLUÇÃO DIÁRIA DO CHAT v2 — 10 questões do banco v1, 3 rodadas × 3 rotas (frota → reserva → omni)
// "mudo" só conta como erro depois de 3 rodadas com 15s de respiro. Histórico: saude-cerebro.md
const fs = require('fs');
const banco = JSON.parse(fs.readFileSync('banco-questoes.json', 'utf8')).questoes;
const dia = Math.floor(Date.now() / 86400000);
const nm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const sorteadas = [];
for (let i = 0; i < 10; i++) sorteadas.push(banco[(dia * 7 + i * 13) % banco.length]);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function rota(nome, url, corpo, bearer) {
  const headers = { 'Content-Type': 'application/json' };
  if (bearer) headers['Authorization'] = 'Bearer unused';
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(corpo), signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  const c = ((((j.choices || [])[0] || {}).message || {}).content) || '';
  return c.trim() ? c.trim() : null;
}
async function pergunta(conteudo) {
  const rotas = [
    ['frota', 'https://nvidia.g4f.dev/v1/chat/completions', { model: 'auto', messages: [{ role: 'user', content: conteudo }], max_tokens: 200 }, true],
    ['reserva', 'https://text.pollinations.ai/openai/chat/completions', { model: 'openai-fast', messages: [{ role: 'user', content: conteudo }], max_tokens: 200 }, false],
    ['omni', 'https://nvidia.g4f.dev/v1/chat/completions', { model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning', messages: [{ role: 'user', content: conteudo }], max_tokens: 200 }, true]
  ];
  for (let rodada = 0; rodada < 3; rodada++) {
    for (const [nome, url, corpo, bearer] of rotas) {
      try { const t = await rota(nome, url, corpo, bearer); if (t) return { texto: t, via: nome }; } catch (e) {}
    }
    if (rodada < 2) await sleep(15000);
  }
  return null;
}
(async () => {
  let ok = 0, mudos = 0; const det = [];
  for (const item of sorteadas) {
    const r = await pergunta('Responda APENAS o que foi pedido, curtíssimo: ' + item.q);
    const resp = r ? r.texto : '';
    if (!r) mudos++;
    const rn = nm(resp);
    const pass = item.g.some(g => { const gn = nm(g); if (!gn) return false; if (gn.length <= 2) return new RegExp('(^| )' + gn + '( |$)').test(rn); return rn.indexOf(gn) >= 0; });
    if (pass) ok++;
    det.push((pass ? '✅' : (r ? '❌' : '🔇')) + (r ? ' [' + r.via + '] ' : ' ') + item.q.slice(0, 55) + ' → ' + (resp || 'mudo').slice(0, 38).replace(/\n/g, ' '));
    await sleep(2000);
  }
  const quando = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const linha = '- ' + quando + ' UTC — ' + ok + '/10 (mudos: ' + mudos + ')' + (ok === 10 ? ' ✨ PERFEITO' : '');
  let prev = '';
  try { prev = fs.readFileSync('saude-cerebro.md', 'utf8'); } catch (e) {}
  const prevLinhas = prev.split('\n').filter(l => l.startsWith('- '));
  let body = '# 🧠 SAÚDE DO CÉREBRO DO CHAT (bateria diária automática v2)\n\nBanco v1 (' + banco.length + ' questões) · 10/dia rotativo · 3 rodadas × 3 rotas (frota→reserva→omni) · 🔇=infraestrutura muda, não erro de cérebro.\n\n' + linha + '\n' + prevLinhas.slice(0, 120).join('\n') + '\n\n**Curva (14 mais recentes):** ' + prevLinhas.concat([linha]).slice(0, 14).map(l => l.split('— ')[1]).reverse().join(' | ') + '\n';
  fs.writeFileSync('saude-cerebro.md', body);
  console.log('EXAME DO DIA v2:', ok + '/10 (mudos: ' + mudos + ')');
  det.forEach(d => console.log(d));
})();
