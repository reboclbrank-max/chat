// Guarda estática do harness Chromium opcional: sem exigir navegador na CI.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..', '..');
const arquivo = path.join(__dirname, 'navegador-lista-controlado.sh');
let certos = 0;
let falhas = 0;
function ok(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}

let texto = '';
ok('harness de navegador existe e é executável', () => {
  const estado = fs.statSync(arquivo);
  assert(estado.mode & 0o111, 'permissão executável ausente');
  texto = fs.readFileSync(arquivo, 'utf8');
});

ok('cobre as quatro rotas e separa a semântica de limpar', () => {
  assert.match(texto, /rotas=\(index\.html direto\.html ligar\.html limpar\.html\)/);
  assert.match(texto, /for rota in "\$\{rotas\[@\]\}"; do/);
  assert.match(texto, /if \[ "\$rota" = 'limpar\.html' \]; then/);
  assert.match(texto, /rota limpar removeu t da URL e mostrou a guarda de token/);
});

ok('fixture troca somente a API da cópia por origem local', () => {
  assert.match(texto, /const API = 'https:\/\/api\.github\.com';/);
  assert.match(texto, /const API = location\.origin;/);
  assert.match(texto, /127\.0\.0\.1/);
  assert.match(texto, /controle-local-sem-segredo/);
  assert.match(texto, /controle-ficticio/);
});

ok('navegador não resolve rede externa e perfis são efêmeros', () => {
  assert.match(texto, /--host-resolver-rules='MAP \* 0\.0\.0\.0, EXCLUDE 127\.0\.0\.1'/);
  assert.match(texto, /mktemp -d \/tmp\/chat-browser-lista\./);
  assert.match(texto, /trap limpar EXIT/);
  assert.match(texto, /rm -rf "\$trabalho"/);
  assert(!/\bcurl\b/.test(texto), 'harness não deve chamar rede por curl');
});

ok('fixture valida atualização PWA sem ativar worker ou perder rascunho', () => {
  assert.match(texto, /esperaControlada/);
  assert.match(texto, /pwaUpdateRequest/);
  assert.match(texto, /atualização aceitou recarregar com rascunho/);
  assert.match(texto, /REBOCL_ATIVAR_ATUALIZACAO/);
});

ok('copia e serve somente a casca local realmente carregada', () => {
  assert.match(texto, /ativos_locais=\(chat-estilos\.css chat-pwa\.js chat-comandos-locais\.js chat-filtro-chips\.js chat-organizacao-local\.js chat-colecoes-local\.js chat-workspace\.js dna\.json\)/);
  assert.match(texto, /const estaticos = new Map\(/);
  assert.match(texto, /\['chat-organizacao-local\.js', 'application\/javascript; charset=utf-8'\]/);
  assert.match(texto, /\['chat-colecoes-local\.js', 'application\/javascript; charset=utf-8'\]/);
  assert.match(texto, /\['chat-workspace\.js', 'application\/javascript; charset=utf-8'\]/);
  assert.match(texto, /\['chat-estilos\.css', 'text\/css; charset=utf-8'\]/);
  assert.match(texto, /fixture sem recurso externo/);
});

ok('exercita favoritos locais controlados sem usar conversa ou rede real', () => {
  assert.match(texto, /const esperarOrganizacao/);
  assert.match(texto, /Favoritos locais não concluíram a transação controlada/);
  assert.match(texto, /const estrelaAtual/);
  assert.match(texto, /nó já substituído/);
  assert.match(texto, /controles de favoritos locais ausentes/);
  assert.match(texto, /filtro local não isolou a conversa favorita/);
  assert.match(texto, /carregar mais sumiu no filtro de favoritas/);
  assert.match(texto, /limpeza explícita não removeu favorito local/);
  assert.match(texto, /favoritos locais marcaram, filtraram e apagaram sem rede/);
});

ok('exercita coleções locais controladas sem usar conversa ou rede real', () => {
  assert.match(texto, /const esperarColecoes/);
  assert.match(texto, /Coleções locais não concluíram a transação controlada/);
  assert.match(texto, /Coleção de fixture/);
  assert.match(texto, /controles de coleções locais ausentes/);
  assert.match(texto, /filtro local não isolou a conversa da coleção/);
  assert.match(texto, /carregar mais sumiu no filtro de coleção/);
  assert.match(texto, /limpeza explícita não removeu coleção local/);
  assert.match(texto, /coleções locais criaram, associaram, filtraram e apagaram sem rede/);
});

ok('exercita recuperação do Workspace e prova o layout em navegador real', () => {
  assert.match(texto, /const esperarWorkspace/);
  assert.match(texto, /Projeto de fixture controlada/);
  assert.match(texto, /Workspace criou, versionou e recuperou arquivo\/projeto somente na fixture/);
  assert.match(texto, /somente-layout=1/);
  assert.match(texto, /Workspace não preservou o layout de três painéis no viewport desktop/);
  assert.match(texto, /Workspace não empilhou os painéis no viewport estreito/);
  assert.match(texto, /--window-size="\$janela"/);
  assert.match(texto, /--screenshot="\$captura"/);
  assert.match(texto, /captura PNG ausente ou inválida/);
  assert.match(texto, /INFO:CONSOLE\.\*\(Uncaught\|Error\)/);
});

ok('não contém padrão usual de segredo', () => {
  assert(!/github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}/.test(texto));
  assert(!/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(texto));
});

console.log(`${certos}/${certos + falhas} testes estáticos do navegador controlado passaram`);
process.exitCode = falhas ? 1 : 0;
