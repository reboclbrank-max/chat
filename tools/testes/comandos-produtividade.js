// 🖥️ Comandos de produtividade do Chat (27/10/2026) — verificação ESTÁTICA.
//
// O placar do roda-testes.js classifica esta suíte como estática de propósito: ela lê
// index.html e as derivadas em vez de executar o Chat. O que se prova aqui:
//   1. os cinco comandos existem e estão ligados ao despachante;
//   2. !farol agrega as fontes certas (motor, plano, fila, memória, execuções);
//   3. !video lê as execuções do gravador e o kit do gameplay;
//   4. !erros lê execuções e o passo que quebrou;
//   5. !cofre lista NOMES e datas de segredos — nunca o valor;
//   6. !postar NÃO publica sem a palavra CONFIRMAR (a regra da casa vale no chat também);
//   7. os hosts usados continuam dentro do connect-src e as quatro rotas têm os comandos.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const base = ler('index.html');
let total = 0;
const falhas = [];
function confere(nome, fn) {
  total++;
  try { fn(); } catch (e) { falhas.push(nome + ' → ' + String(e.message || e).slice(0, 160)); }
}
const linhaDe = (cmd) => base.split('\n').find((l) => l.startsWith("  if (m.startsWith('" + cmd + "'))")) || '';

confere('!painel existe e agrega motor, plano, fila, memória e execuções', () => {
  const l = linhaDe('!farol');
  assert(l, 'comando ausente');
  ['posts/orquestrador.json', 'posts/plano-do-dia.json', 'posts/fila-tarefas.json',
    'posts/memoria.json', '/actions/runs?per_page=20'].forEach((m) => {
    assert(l.includes(m), 'não consulta ' + m);
  });
});

confere('!video lê as execuções do gravador e o kit do gameplay', () => {
  const l = linhaDe('!video');
  assert(l, 'comando ausente');
  assert(l.includes('gravar-gameplay.yml/runs'), 'não lê as execuções do gravador');
  assert(l.includes('posts/kit-gameplay.json'), 'não lê o kit do gameplay');
  assert(l.includes('ceifalume-gameplay.mp4'), 'não confere o arquivo do vídeo');
});

confere('!erros mostra execução e o passo que quebrou', () => {
  const l = linhaDe('!erros');
  assert(l, 'comando ausente');
  assert(l.includes("conclusion === 'failure'"), 'não filtra falhas');
  assert(l.includes('/jobs'), 'não abre os passos do run');
  assert(l.includes('steps'), 'não identifica o passo que quebrou');
});

confere('!cofre lista nomes e datas, nunca valores', () => {
  const l = linhaDe('!cofre');
  assert(l, 'comando ausente');
  assert(l.includes('/actions/secrets'), 'não lê o cofre');
  assert(l.includes('updated_at'), 'não mostra quando o segredo foi trocado');
  assert(l.includes('nunca mostro o valor'), 'sem a promessa de não expor valor');
  assert(!/secrets\/[^ ]*\/values/.test(l), 'tenta ler valor de segredo');
});

confere('!postar só dispara com a palavra CONFIRMAR', () => {
  const l = linhaDe('!postar');
  assert(l, 'comando ausente');
  assert(l.includes("palavra !== 'CONFIRMAR'"), 'não exige a palavra');
  assert(l.includes('postagem-diaria.yml/dispatches'), 'não sabe disparar a postagem');
  // o dispatch tem que estar DEPOIS da barreira da palavra
  const i = l.indexOf("palavra !== 'CONFIRMAR'");
  const j = l.indexOf('dispatches');
  assert(j > i, 'dispara antes de conferir a palavra');
  assert(/NAO publiquei nada/.test(l), 'não avisa que nada saiu sem confirmação');
});

confere('os comandos novos usam só hosts permitidos pela CSP', () => {
  const m = base.match(/connect-src[^"]*/);
  assert(m, 'connect-src ausente');
  assert(m[0].includes('https://api.github.com') || m[0].includes('api.github.com'),
    'api.github.com fora do connect-src');
  assert(m[0].includes('raw.githubusercontent.com'), 'raw.githubusercontent fora do connect-src');
});

confere('as quatro rotas carregam os cinco comandos', () => {
  for (const rota of ['index.html', 'direto.html', 'ligar.html', 'limpar.html']) {
    const texto = ler(rota);
    for (const cmd of ['!farol', '!video', '!erros', '!cofre', '!postar']) {
      assert(texto.includes("startsWith('" + cmd + "')"), rota + ' sem ' + cmd);
    }
  }
});

confere('nenhum comando novo engole erro em silêncio', () => {
  for (const cmd of ['!farol', '!video', '!erros', '!cofre', '!postar']) {
    const l = linhaDe(cmd);
    const vazios = (l.match(/catch \(e\) \{\s*\}/g) || []).length;
    assert(vazios === 0, cmd + ' tem catch vazio');
  }
});

console.log((total - falhas.length) + '/' + total + ' testes dos comandos de produtividade passaram');
if (falhas.length) { falhas.forEach((f) => console.log('✘ ' + f)); process.exit(1); }
