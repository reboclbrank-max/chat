// 🧠 EVOLUÇÃO DIÁRIA DO CHAT — bateria de 10 questões do banco v1, sorteio rotativo por dia
// rota real do cérebro: frota keyless (g4f auto) → reserva (pollinations). Histórico: saude-cerebro.md
const fs = require('fs');
const banco = JSON.parse(fs.readFileSync('banco-questoes.json', 'utf8')).questoes;
const dia = Math.floor(Date.now() / 86400000);
const nm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const sorteadas = [];
for (let i = 0; i < 10; i++) sorteadas.push(banco[(dia * 7 + i * 13) % banco.length]);
async function pergunta(conteudo) {
  const tentativas = [
    () => fetch('https://nvidia.g4f.dev/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer unused' }, body: JSON.stringify({ model: 'auto', messages: [{ role: 'user', content: conteudo }], max_tokens: 200 }), signal: AbortSignal.timeout(60000) }),
    () => fetch('https://text.pollinations.ai/openai/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'openai-fast', messages: [{ role: 'user', content: conteudo }], max_tokens: 200 }), signal: AbortSignal.timeout(90000) })
  ];
  for (const t of tentativas) {
    try { const r = await t(); if (!r.ok) continue; const j = await r.json(); const c = ((((j.choices || [])[0] || {}).message || {}).content) || ''; if (c.trim()) return c.trim(); } catch (e) {}
  }
  return '';
}
(async () => {
  let ok = 0; const det = [];
  for (const item of sorteadas) {
    const resp = await pergunta('Responda APENAS o que foi pedido, curtíssimo: ' + item.q);
    const rn = nm(resp);
    const pass = item.g.some(g => { const gn = nm(g); if (!gn) return false; if (gn.length <= 2) return new RegExp('(^| )' + gn + '( |$)').test(rn); return rn.indexOf(gn) >= 0; });
    if (pass) ok++;
    det.push((pass ? '✅' : '❌') + ' ' + item.q.slice(0, 60) + ' → ' + (resp || 'mudo').slice(0, 40).replace(/\n/g, ' '));
  }
  const quando = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const linha = '- ' + quando + ' UTC — ' + ok + '/10' + (ok === 10 ? ' ✨ PERFEITO' : '') + ' (frota→reserva)';
  let prev = '';
  try { prev = fs.readFileSync('saude-cerebro.md', 'utf8'); } catch (e) {}
  const prevLinhas = prev.split('\n').filter(l => l.startsWith('- '));
  let body = '# 🧠 SAÚDE DO CÉREBRO DO CHAT (bateria diária automática)\n\nBanco v1 (' + banco.length + ' questões) · 10 por dia, sorteio rotativo · frota keyless → reserva · gravado pelo GitHub Actions.\n\n' + linha + '\n' + prevLinhas.slice(0, 120).join('\n') + '\n\n**Curva (14 exames mais recentes):** ' + prevLinhas.concat([linha]).slice(0, 14).map(l => l.split('— ')[1]).reverse().join(' | ') + '\n';
  fs.writeFileSync('saude-cerebro.md', body);
  console.log('EXAME DO DIA:', ok + '/10');
  det.forEach(d => console.log(d));
})();
