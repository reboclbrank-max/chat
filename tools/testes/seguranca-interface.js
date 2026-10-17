// 🔐 Barreira estática das correções de segurança do chat.
// Não abre navegador nem usa rede: impede retorno acidental dos fluxos inseguros.
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '..', '..');
let total = 0, erros = 0;
function testa(nome, ok) {
  total++;
  if (!ok) erros++;
  console.log((ok ? '✔ ' : '✘ ') + nome);
}
function ler(nome) { return fs.readFileSync(path.join(raiz, nome), 'utf8'); }
function bloco(texto, inicio, fim) {
  const a = texto.indexOf(inicio); const b = texto.indexOf(fim, a);
  return a >= 0 && b >= 0 ? texto.slice(a, b) : '';
}

const paginas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
for (const nome of paginas) {
  const html = ler(nome);
  testa(nome + ' não lê token da query', !/\.get\(['"]t['"]\)/.test(html));
  testa(nome + ' não grava token em localStorage', !/localStorage\.setItem\(['"]assistente_rebocl_token['"]/.test(html) && !/localStorage\.setItem\(CHAVE_TOKEN/.test(html));
  testa(nome + ' usa sessão para token', /sessionStorage\.getItem\(CHAVE_TOKEN\)/.test(html) && /guardarTokenSeguro/.test(html));
  testa(nome + ' bloqueia token antes de enviar', /Token não é mensagem/.test(html));
  testa(nome + ' usa DNA relativo', !/raw\.githubusercontent\.com\/reboclbrank-max\/chat\/main\/dna\.json/.test(html) && /fetch\(['"]\.\/dna\.json['"]/.test(html));
  testa(nome + ' fixa WebLLM', /@mlc-ai\/web-llm@0\.2\.86\//.test(html) && !/@mlc-ai\/web-llm@latest/.test(html));
  const canal = bloco(html, 'async function beberCanal()', 'let turnoN');
  testa(nome + ' canal não adota automaticamente', !!canal && !/OURO\.push|rebocl_extra_frota|\/chat\/completions/.test(canal));
  const seletor = bloco(html, 'function montarSeletorCerebro()', '/* ---------- comandos rápidos ---------- */');
  testa(nome + ' seletor não interpola HTML remoto', !!seletor && !/\.innerHTML/.test(seletor) && /textContent/.test(seletor));
  testa(nome + ' não publica resumo privado no canal', !/SUM\|v1|registro-de-decisoes\.md[\s\S]{0,700}ntfy\.sh\/rebocl-enxame/.test(html));
}
const sw = ler('sw.js');
testa('service worker recusa query e recursos fora da casca', /url\.search/.test(sw) && /ARQUIVOS_CACHEAVEIS/.test(sw) && /cache: 'no-store'/.test(sw));
const consoleHtml = ler('console.html');
testa('console usa token de sessão', /sessionStorage\.getItem\(CHAVE_TOKEN\)/.test(consoleHtml));
testa('console renderiza ordens com DOM', /caixa\.replaceChildren\(\)/.test(consoleHtml) && /titulo\.textContent/.test(consoleHtml));
const email = ler('tools/email-chat.js');
testa('OCR externo exige autorização explícita', /function ocrExternoAutorizado/.test(email) && /if \(!permitido\) return ''/.test(email));
testa('anexos usam diretório temporário privado', /function criaTemp\(/.test(email) && !/\/tmp\/ocr-casa|\/tmp\/olho-casa|\/tmp\/doc-recebido/.test(email));
const foto = ler('tools/prepara-foto.py');
testa('preparo de foto regrava e remove metadados', /Toda imagem é regravada/.test(foto) && !/já estava boa/.test(foto));
const wf = fs.readdirSync(path.join(raiz, '.github', 'workflows')).filter(n => n.endsWith('.yml')).map(n => ler('.github/workflows/' + n)).join('\n');
testa('actions são fixadas por SHA', !/\buses:\s+[^\s]+@(v\d+|main|master|latest)\b/.test(wf));
const prova = ler('provas/teste-email-2026-10-14-0417.md');
testa('prova pública não contém e-mail completo', !/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(prova));
console.log((total - erros) + '/' + total + ' verificações de segurança passaram');
if (erros) process.exitCode = 1;
