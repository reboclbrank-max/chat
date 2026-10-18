// Regressão de capacidade da interface: a API do GitHub pagina comentários em
// lotes de até 100. A tela deve usar a janela mais recente, o polling deve usar
// cursor temporal com deduplicação por ID e a exportação deve paginar comentários e conversas.
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
function extraiHelpers(src) {
  const inicio = src.indexOf('const TAMANHO_PAGINA_COMENTARIOS = 100;');
  const fim = src.indexOf('\nfunction escapar(t) {', inicio);
  assert(inicio >= 0 && fim > inicio, 'helpers de paginação não encontrados');
  return src.slice(inicio, fim);
}
function runtime(src, resposta) {
  const chamadas = [];
  const ctx = {
    REPO: 'dono/repo',
    ultimoId: 0,
    ultimoQuando: '',
    Date,
    Number,
    Math,
    Array,
    Promise,
    encodeURIComponent,
    api: async (caminho) => { chamadas.push(caminho); return resposta(caminho); }
  };
  vm.createContext(ctx);
  vm.runInContext(extraiHelpers(src) + `
    globalThis.paginaFinalTeste = paginaFinalComentarios;
    globalThis.recentesTeste = comentariosRecentes;
    globalThis.todosTeste = todosComentarios;
    globalThis.conversasTeste = todasConversas;
    globalThis.desdeTeste = comentariosDesde;
    globalThis.registrarTeste = registrarComentario;
  `, ctx);
  return { ctx, chamadas };
}
function paginaDo(caminho) {
  return Number(new URL('https://exemplo.local' + caminho).searchParams.get('page'));
}
function itens(inicio, fim) {
  return Array.from({ length: fim - inicio + 1 }, (_, i) => ({ id: inicio + i }));
}
function conversas(inicio, fim) {
  return Array.from({ length: fim - inicio + 1 }, (_, i) => ({ number: inicio + i }));
}

async function main() {
  const src = fonte('index.html');
  testa('calcula a página final em fronteiras de 100 comentários', () => {
    const r = runtime(src, () => []);
    assert.equal(r.ctx.paginaFinalTeste(0), 1);
    assert.equal(r.ctx.paginaFinalTeste(1), 1);
    assert.equal(r.ctx.paginaFinalTeste(100), 1);
    assert.equal(r.ctx.paginaFinalTeste(101), 2);
    assert.equal(r.ctx.paginaFinalTeste(201), 3);
  });
  await testaAsync('janela recente mantém os últimos 100 mesmo com resto na página final', async () => {
    const r = runtime(src, (caminho) => paginaDo(caminho) === 1 ? itens(1, 100) : itens(101, 101));
    const janela = await r.ctx.recentesTeste(73, 101);
    assert.deepEqual(Array.from(janela, (c) => c.id), itens(2, 101).map((c) => c.id));
    assert.deepEqual(r.chamadas.map(paginaDo).sort((a, b) => a - b), [1, 2]);
    assert(r.chamadas.every((c) => /per_page=100/.test(c)));
  });
  await testaAsync('exportação pagina todos os comentários conhecidos e preserva a ordem', async () => {
    const r = runtime(src, (caminho) => {
      const p = paginaDo(caminho);
      return p === 1 ? itens(1, 100) : p === 2 ? itens(101, 200) : itens(201, 201);
    });
    const todos = await r.ctx.todosTeste(73, 201);
    assert.deepEqual(Array.from(todos, (c) => c.id), itens(1, 201).map((c) => c.id));
    assert.deepEqual(r.chamadas.map(paginaDo), [1, 2, 3]);
  });
  await testaAsync('exportação geral pagina o catálogo de conversas acima de 100', async () => {
    const r = runtime(src, (caminho) => {
      assert.match(caminho, /\/issues\?state=all/);
      const p = paginaDo(caminho);
      return p === 1 ? conversas(1, 100) : p === 2 ? conversas(101, 200) : conversas(201, 201);
    });
    const todas = await r.ctx.conversasTeste();
    assert.deepEqual(Array.from(todas, (c) => c.number), conversas(1, 201).map((c) => c.number));
    assert.deepEqual(r.chamadas.map(paginaDo), [1, 2, 3]);
  });
  await testaAsync('polling pede a janela posterior com margem de um segundo', async () => {
    const r = runtime(src, () => []);
    await r.ctx.desdeTeste(73, '2026-10-18T12:00:00Z');
    assert.equal(r.chamadas.length, 1);
    assert.match(r.chamadas[0], /page=1/);
    assert.match(r.chamadas[0], /since=2026-10-18T11%3A59%3A59Z/);
  });
  await testaAsync('polling pagina uma rajada posterior maior que 100 sem perder a cauda', async () => {
    const r = runtime(src, (caminho) => paginaDo(caminho) === 1 ? itens(301, 400) : itens(401, 401));
    const novos = await r.ctx.desdeTeste(73, '2026-10-18T12:00:00Z');
    assert.deepEqual(Array.from(novos, (c) => c.id), itens(301, 401).map((c) => c.id));
    assert.deepEqual(r.chamadas.map(paginaDo), [1, 2]);
  });
  testa('cursor conserva o maior ID e o instante mais recente', () => {
    const r = runtime(src, () => []);
    r.ctx.registrarTeste({ id: 10, created_at: '2026-10-18T12:00:00Z' });
    r.ctx.registrarTeste({ id: 9, updated_at: '2026-10-18T11:59:59Z' });
    r.ctx.registrarTeste({ id: 12, updated_at: '2026-10-18T12:00:01Z' });
    assert.equal(r.ctx.ultimoId, 12);
    assert.equal(r.ctx.ultimoQuando, '2026-10-18T12:00:01Z');
  });
  for (const nome of variantes) {
    const html = fonte(nome);
    testa(nome + ' usa janela recente, cursor e exportação paginada', () => {
      assert.match(html, /comentariosRecentes\(numero, issue\.comments\)/);
      assert.match(html, /comentariosDesde\(conversa, ultimoQuando\)/);
      assert.match(html, /todosComentarios\(i\.number, i\.comments\)/);
      assert.match(html, /todosComentarios\(conversa, issue\.comments\)/);
      assert.match(html, /const issues = await todasConversas\(\);/);
      assert.match(html, /async function todasConversas\(\)/);
      assert.match(html, /comentariosRecentes\(numero, issue && issue\.comments\)/);
      assert.match(html, /avisoHistoricoParcial\(issue\.comments, comentarios\.length\)/);
      assert.doesNotMatch(html, /comments\?per_page=100/);
    });
  }
  console.log(`${certos}/${certos + falhas} testes de paginação de conversas passaram`);
  process.exitCode = falhas ? 1 : 0;
}
main().catch((e) => { console.error(e.stack || e.message); process.exitCode = 1; });
