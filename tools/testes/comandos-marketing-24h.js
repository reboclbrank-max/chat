// 📣 Comandos do motor 24h no Chat (27/10/2026) — verificação ESTÁTICA.
//
// Esta suíte não executa o Chat: ela lê index.html e as derivadas. O placar do
// roda-testes.js classifica assim de propósito, para ninguém confundir contrato
// com comportamento. O que se prova aqui:
//   1. os três comandos novos existem e estão ligados ao despachante;
//   2. cada um lê o arquivo certo do repositório `site` (nada de host inventado);
//   3. os hosts usados estão no connect-src (senão a CSP derruba a página);
//   4. o `!itch` não promete mais favorito/bookmarklet (promessa que não se cumpria);
//   5. as rotas derivadas continuam em sincronia (quem garante é paginas-geradas,
//      aqui só se confirma que os comandos aparecem nas quatro páginas).
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const base = ler('index.html');
let ok = 0, total = 0;
const falhas = [];
function confere(nome, fn) {
  total++;
  try { fn(); ok++; } catch (e) { falhas.push(nome + ' → ' + String(e.message || e).slice(0, 140)); }
}

confere('!marketing está ligado ao despachante', () => {
  assert(/m\.startsWith\('!marketing'\)/.test(base), 'comando ausente');
  assert(base.includes("posts/orquestrador.json"), 'não lê o orquestrador');
  assert(base.includes("posts/plano-do-dia.json"), 'não lê o plano do dia');
  assert(base.includes("posts/aprendizado.json"), 'não lê o aprendizado');
});

confere('!fila mostra pendentes, feitas e falhas', () => {
  assert(/m\.startsWith\('!fila'\)/.test(base), 'comando ausente');
  assert(base.includes("posts/fila-tarefas.json"), 'não lê a fila de tarefas');
  assert(base.includes("'falhou'") && base.includes("'pendente'"), 'não distingue estado da tarefa');
});

confere('!medido consulta a memória e não inventa', () => {
  assert(/m\.startsWith\('!medido'\)/.test(base), 'comando ausente');
  assert(base.includes("posts/memoria.json"), 'não lê a memória');
  assert(base.includes('n\u00e3o invento o que n\u00e3o est\u00e1 medido'), 'sem aviso de ausência');
});

confere('os comandos usam só hosts que a CSP permite', () => {
  const m = base.match(/connect-src[^"]*/);
  assert(m, 'connect-src ausente');
  assert(m[0].includes('https://raw.githubusercontent.com'), 'raw.githubusercontent fora do connect-src');
  assert(base.includes('https://raw.githubusercontent.com/reboclbrank-max/site/main/'), 'não aponta para o repositório site');
});

confere('!itch não promete mais favorito/bookmarklet', () => {
  const linha = base.split('\n').find((l) => l.startsWith("  if (m.startsWith('!itch'))")) || '';
  assert(linha, 'linha do !itch não encontrada');
  // A palavra pode aparecer — a proibição é PEDIR o favorito, não citá-la para negar.
  assert(!/clique em favorito|adicionar aos favoritos|favoritar/i.test(linha), 'ainda pede favorito');
  assert(/N\u00e3o vou te pedir favorito/.test(linha), 'não registra que desistiu do pedido');
  assert(!/bookmarklet/.test(linha), 'ainda cita bookmarklet');
  assert(/Cloudflare/.test(linha), 'não explica o bloqueio medido');
});

confere('as quatro rotas carregam os três comandos', () => {
  for (const rota of ['index.html', 'direto.html', 'ligar.html', 'limpar.html']) {
    const texto = ler(rota);
    for (const cmd of ['!marketing', '!fila', '!medido']) {
      assert(texto.includes("startsWith('" + cmd + "')"), rota + ' sem ' + cmd);
    }
  }
});

console.log((total - falhas.length) + '/' + total + ' testes dos comandos do motor 24h passaram');
if (falhas.length) { falhas.forEach((f) => console.log('✘ ' + f)); process.exit(1); }
