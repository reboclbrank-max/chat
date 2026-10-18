// Regressão da recuperação da interface: só antecipa a rota de emergência
// quando o run correlacionado do trabalhador terminou em falha. Fila, run pendente,
// evento diferente e janela antiga continuam no polling normal.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '..', '..');
const variantes = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0;
let falhas = 0;
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
}
async function testaAsync(nome, fn) {
  try { await fn(); certos++; console.log('✔ ' + nome); }
  catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
}
function fonte(nome) { return fs.readFileSync(path.join(raiz, nome), 'utf8'); }
function extraiVerificador(src) {
  const inicio = src.indexOf('async function trabalhadorFalhouRapido(contexto) {');
  const fim = src.indexOf('\nfunction iniciarPolling(', inicio);
  assert(inicio >= 0 && fim > inicio, 'verificador não encontrado');
  return src.slice(inicio, fim);
}
function extraiMarca(src) {
  const inicio = src.indexOf("const DONO_GITHUB = 'reboclbrank-max';");
  const fim = src.indexOf('\nfunction avisar(', inicio);
  assert(inicio >= 0 && fim > inicio, 'tratamento de marca não encontrado');
  return src.slice(inicio, fim);
}
function runtimeMarca(src) {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(extraiMarca(src) + '\nglobalThis.ehBotTeste = ehBot; globalThis.limparTeste = limparAssinatura;', ctx);
  return ctx;
}
function runtime(src, runs) {
  let caminho = '';
  const ctx = {
    token: 'presente-somente-no-teste',
    REPO: 'reboclbrank-max/agente',
    Date,
    Number,
    api: async (p) => { caminho = p; return { workflow_runs: runs }; }
  };
  vm.createContext(ctx);
  vm.runInContext(extraiVerificador(src) + '\nglobalThis.verificar = trabalhadorFalhouRapido;', ctx);
  return { ctx, caminho: () => caminho };
}

async function main() {
  for (const nome of variantes) {
    const src = fonte(nome);
    testa(nome + ' conserva o gatilho estrito e a correlação', () => {
      assert.match(src, /actions\/workflows\/chat\.yml\/runs\?per_page=10/);
      assert.match(src, /r\.event === contexto\.evento/);
      assert.match(src, /r\.status === 'completed' && r\.conclusion === 'failure'/);
      assert.match(src, /tentativas >= 2/);
      assert.match(src, /emergenciaResponder\(conversa\)/);
      assert.match(src, /evento: 'issue_comment'/);
      assert.match(src, /evento: 'issues'/);
      assert.match(src, /const DONO_GITHUB = 'reboclbrank-max';/);
      assert.match(src, /const MARCADOR_EMERGENCIA = '<!-- rebocl-emergencia -->';/);
      assert.match(src, /function ehRespostaEmergencia\(c\)/);
      assert.match(src, /c\.user\.login === DONO_GITHUB/);
      assert.match(src, /api\('\/repos\/' \+ REPO \+ '\/issues\/' \+ numero\)/);
      assert.match(src, /const inicial = limparAssinatura\(\(issue && issue\.body\) \|\| ''\)/);
      assert.match(src, /body: MARCADOR_EMERGENCIA \+ '\\n' \+ maos/);
      assert.match(src, /body: MARCADOR_EMERGENCIA \+ '\\n' \+ corpo/);
    });
    testa(nome + ' só reconhece a marca publicada pelo dono e a remove antes de exibir', () => {
      const r = runtimeMarca(src);
      const marcadaDoDono = { user: { login: 'reboclbrank-max' }, body: '<!-- rebocl-emergencia -->\nresposta' };
      const marcadaDeOutro = { user: { login: 'outra-pessoa' }, body: '<!-- rebocl-emergencia -->\npergunta' };
      const marcaNoMeioDoDono = { user: { login: 'reboclbrank-max' }, body: 'pergunta normal\n<!-- rebocl-emergencia -->' };
      assert.equal(r.ehBotTeste(marcadaDoDono), true);
      assert.equal(r.ehBotTeste(marcadaDeOutro), false);
      assert.equal(r.ehBotTeste(marcaNoMeioDoDono), false);
      assert.equal(r.limparTeste(marcadaDoDono.body), 'resposta');
    });
    await testaAsync(nome + ' antecipa somente falha recente do mesmo evento', async () => {
      const inicio = Date.now();
      const run = { event: 'issues', created_at: new Date(inicio + 100).toISOString(), status: 'completed', conclusion: 'failure' };
      const r = runtime(src, [run]);
      assert.equal(await r.ctx.verificar({ inicio, evento: 'issues' }), true);
      assert.match(r.caminho(), /\/repos\/reboclbrank-max\/agente\/actions\/workflows\/chat\.yml\/runs/);
    });
    await testaAsync(nome + ' não confunde fila, êxito, evento alheio ou janela antiga', async () => {
      const inicio = Date.now();
      for (const run of [
        { event: 'issues', created_at: new Date(inicio + 100).toISOString(), status: 'in_progress', conclusion: null },
        { event: 'issues', created_at: new Date(inicio + 100).toISOString(), status: 'completed', conclusion: 'success' },
        { event: 'issue_comment', created_at: new Date(inicio + 100).toISOString(), status: 'completed', conclusion: 'failure' }
      ]) {
        const r = runtime(src, [run]);
        assert.equal(await r.ctx.verificar({ inicio, evento: 'issues' }), false);
      }
      const rAntigo = runtime(src, []);
      assert.equal(await rAntigo.ctx.verificar({ inicio: Date.now() - 45001, evento: 'issues' }), false);
      assert.equal(rAntigo.caminho(), '');
    });
  }
  console.log(`${certos}/${certos + falhas} testes da recuperação rápida passaram`);
  process.exitCode = falhas ? 1 : 0;
}
main().catch((e) => { console.error(e.stack || e.message); process.exitCode = 1; });
