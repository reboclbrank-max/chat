// Regressão de capacidade da interface: a API do GitHub pagina comentários e
// Issues. A tela mantém a janela recente, o polling usa cursor temporal com
// deduplicação por ID, a exportação percorre o catálogo e a lista visual avança sob demanda.
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
function extraiColetor(src) {
  const inicio = src.indexOf('async function coletarConversas() {');
  const fim = src.indexOf('\nasync function exportarTudo(', inicio);
  assert(inicio >= 0 && fim > inicio, 'coletor de exportação não encontrado');
  return src.slice(inicio, fim);
}
function runtimeColetor(src, issues, comentarios) {
  const ctx = {
    todasConversas: async () => issues,
    todosComentarios: async (numero) => comentarios(numero),
    ehBot: () => false
  };
  vm.createContext(ctx);
  vm.runInContext(extraiColetor(src) + '\nglobalThis.coletarTeste = coletarConversas;', ctx);
  return ctx;
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
    globalThis.caminhoListaTeste = caminhoListaAberta;
    globalThis.incorporarListaTeste = incorporarConversas;
    globalThis.desdeTeste = comentariosDesde;
    globalThis.registrarTeste = registrarComentario;
  `, ctx);
  return { ctx, chamadas };
}
function extraiLista(src) {
  const inicio = src.indexOf('function criarCartaoConversa(i) {');
  const fim = src.indexOf('\nasync function novaConversa()', inicio);
  assert(inicio >= 0 && fim > inicio, 'lógica da lista visual não encontrada');
  return src.slice(inicio, fim);
}
function textoDeHtml(valor) {
  return String(valor || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
class ElementoFalso {
  constructor(tag) {
    this.tagName = String(tag || '').toUpperCase();
    this.children = [];
    this.style = {};
    this.className = '';
    this.id = '';
    this.onclick = null;
    this.onkeydown = null;
    this.tabIndex = -1;
    this.atributos = {};
    this._html = '';
  }
  set innerHTML(valor) { this._html = String(valor || ''); this.children = []; }
  get innerHTML() { return this._html; }
  set textContent(valor) { this._html = String(valor || ''); this.children = []; }
  get textContent() {
    return this.children.length ? this.children.map((filho) => filho.textContent).join(' ') : textoDeHtml(this._html);
  }
  appendChild(filho) { this.children.push(filho); return filho; }
  setAttribute(nome, valor) { this.atributos[nome] = String(valor); }
}
function runtimeLista(src, responder, cacheInicial = [], salvarCache = null) {
  const lista = new ElementoFalso('div');
  const faixa = new ElementoFalso('div');
  const busca = new ElementoFalso('input');
  busca.value = '';
  const estaticos = { lista, faixa, busca };
  const porId = (no, id) => {
    if (no.id === id) return no;
    for (const filho of no.children) {
      const achado = porId(filho, id);
      if (achado) return achado;
    }
    return null;
  };
  const obter = (id) => estaticos[id] || porId(lista, id);
  const document = {
    createElement: (tag) => new ElementoFalso(tag),
    getElementById: obter,
    querySelectorAll: (seletor) => seletor === '#lista .conv'
      ? lista.children.filter((no) => /(^|\s)conv(?:\s|$)/.test(no.className)) : []
  };
  const chamadas = [];
  const gravacoes = [];
  const ctx = {
    REPO: 'dono/repo', Date, Number, Math, Array, Set, String,
    document, $: obter, elLista: lista, elFaixa: faixa,
    escapar: (valor) => String(valor || ''),
    quando: (valor) => String(valor || ''),
    abrir: () => {}, novaConversa: () => {},
    cacheSalvarLista: (itens) => {
      const fotografia = Array.from(itens, (i) => i.number);
      gravacoes.push(fotografia);
      return salvarCache ? salvarCache(fotografia) : undefined;
    },
    cacheLerLista: async () => cacheInicial,
    api: async (caminho) => { chamadas.push(caminho); return responder(caminho); }
  };
  vm.createContext(ctx);
  vm.runInContext(`
    let paginaLista = 1, listaAtual = [], maisListaDisponivel = false, carregandoMaisLista = false, revisaoLista = 0;
    let filaCacheLista = Promise.resolve();
    ${extraiHelpers(src)}
    ${extraiLista(src)}
    globalThis.carregarListaTeste = carregarLista;
    globalThis.carregarMaisListaTeste = carregarMaisConversas;
    globalThis.aplicarFiltroListaTeste = aplicarFiltroLista;
    globalThis.estadoListaTeste = () => ({
      pagina: paginaLista,
      numeros: listaAtual.map((i) => i.number),
      mais: maisListaDisponivel,
      carregando: carregandoMaisLista
    });
  `, ctx);
  return { ctx, chamadas, gravacoes, lista, faixa, busca, obter };
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
  testa('lista aberta monta páginas sob demanda com tamanho limitado', () => {
    const r = runtime(src, () => []);
    assert.equal(r.ctx.caminhoListaTeste(0), '/repos/dono/repo/issues?state=open&per_page=50&sort=updated&page=1');
    assert.equal(r.ctx.caminhoListaTeste(2), '/repos/dono/repo/issues?state=open&per_page=50&sort=updated&page=2');
  });
  testa('lista sob demanda deduplica conversa deslocada sem perder a ordem carregada', () => {
    const r = runtime(src, () => []);
    const lista = r.ctx.incorporarListaTeste([{ number: 9 }, { number: 8 }], [{ number: 9 }, { number: 7 }, { number: 6 }]);
    assert.deepEqual(Array.from(lista, (i) => i.number), [9, 8, 7, 6]);
  });
  await testaAsync('lista visual carrega próxima página sob toque, deduplica e esconde controles na busca', async () => {
    const primeira = conversas(51, 100);
    const segunda = [{ number: 51 }].concat(conversas(1, 49));
    const r = runtimeLista(src, (caminho) => {
      const pagina = paginaDo(caminho);
      return pagina === 1 ? primeira : pagina === 2 ? segunda : [];
    });
    await r.ctx.carregarListaTeste();
    assert.deepEqual(Array.from(r.ctx.estadoListaTeste().numeros), primeira.map((i) => i.number));
    assert.equal(r.ctx.estadoListaTeste().mais, true);
    assert(r.obter('card-mais'), 'controle para próxima página ausente');
    await r.ctx.carregarMaisListaTeste();
    assert.deepEqual(r.chamadas.map(paginaDo), [1, 2]);
    assert.equal(r.ctx.estadoListaTeste().pagina, 2);
    assert.equal(r.ctx.estadoListaTeste().numeros.length, 99);
    assert.equal(r.ctx.estadoListaTeste().mais, true);
    assert.deepEqual(r.gravacoes, [primeira.map((i) => i.number), r.ctx.estadoListaTeste().numeros]);
    r.busca.value = 'sem-correspondência';
    r.ctx.aplicarFiltroListaTeste();
    assert.equal(r.obter('card-mais').style.display, 'none');
    r.busca.value = '';
    r.ctx.aplicarFiltroListaTeste();
    assert.equal(r.obter('card-mais').style.display, '');
    await r.ctx.carregarMaisListaTeste();
    assert.equal(r.ctx.estadoListaTeste().pagina, 3);
    assert.equal(r.ctx.estadoListaTeste().mais, false);
    assert.equal(r.obter('card-mais'), null);
  });
  await testaAsync('gravação lenta do cache não bloqueia o próximo toque na lista', async () => {
    const primeira = conversas(1, 50);
    const segunda = conversas(51, 100);
    let liberar;
    let primeiraGravacao = true;
    const r = runtimeLista(src, (caminho) => paginaDo(caminho) === 1 ? primeira : segunda, [], () => {
      if (!primeiraGravacao) return Promise.resolve();
      primeiraGravacao = false;
      return new Promise((res) => { liberar = res; });
    });
    await r.ctx.carregarListaTeste();
    await new Promise((res) => setImmediate(res));
    assert.equal(typeof liberar, 'function');
    await r.ctx.carregarMaisListaTeste();
    assert.deepEqual(r.chamadas.map(paginaDo), [1, 2]);
    assert.equal(r.ctx.estadoListaTeste().carregando, false);
    liberar();
    await new Promise((res) => setImmediate(res));
  });
  await testaAsync('resposta antiga de próxima página não sobrescreve uma lista recém-atualizada', async () => {
    const antiga = conversas(1, 50);
    const nova = conversas(201, 250);
    const loteAntigo = conversas(51, 100);
    let chamadasPrimeira = 0;
    let liberarLoteAntigo;
    const r = runtimeLista(src, (caminho) => {
      if (paginaDo(caminho) === 1) return ++chamadasPrimeira === 1 ? antiga : nova;
      return new Promise((res) => { liberarLoteAntigo = res; });
    });
    await r.ctx.carregarListaTeste();
    const pendente = r.ctx.carregarMaisListaTeste();
    assert.equal(typeof liberarLoteAntigo, 'function');
    await r.ctx.carregarListaTeste();
    liberarLoteAntigo(loteAntigo);
    await pendente;
    const estado = r.ctx.estadoListaTeste();
    assert.equal(estado.pagina, 1);
    assert.deepEqual(Array.from(estado.numeros), nova.map((i) => i.number));
    assert.equal(estado.mais, true);
    assert.deepEqual(r.chamadas.map(paginaDo), [1, 2, 1]);
  });
  await testaAsync('falha da próxima página preserva cartões, cache e tentativa visível', async () => {
    const primeira = conversas(1, 50);
    const r = runtimeLista(src, (caminho) => {
      if (paginaDo(caminho) === 1) return primeira;
      throw new Error('rede simulada');
    });
    await r.ctx.carregarListaTeste();
    const antes = r.ctx.estadoListaTeste();
    await r.ctx.carregarMaisListaTeste();
    const depois = r.ctx.estadoListaTeste();
    assert.equal(depois.pagina, antes.pagina);
    assert.deepEqual(Array.from(depois.numeros), Array.from(antes.numeros));
    assert.equal(depois.mais, true);
    assert.equal(r.gravacoes.length, 1);
    const card = r.obter('card-mais');
    assert(card && /Não consegui carregar agora/.test(card.innerHTML), 'tentativa de recuperação não ficou visível');
    assert.equal(typeof card.onclick, 'function');
  });
  await testaAsync('exportação cancela em vez de gerar arquivo parcial se faltar o histórico de uma conversa', async () => {
    const issues = [
      { number: 1, title: 'uma', state: 'open', created_at: '2026-10-18T12:00:00Z', body: 'início', comments: 1 },
      { number: 2, title: 'duas', state: 'closed', created_at: '2026-10-18T12:01:00Z', body: 'início', comments: 1 }
    ];
    const ok = runtimeColetor(src, issues, async (numero) => [{ body: 'resposta ' + numero, created_at: '2026-10-18T12:02:00Z' }]);
    const todas = await ok.coletarTeste();
    assert.deepEqual(Array.from(todas, (c) => c.numero), [1, 2]);
    const falha = runtimeColetor(src, issues, async (numero) => {
      if (numero === 2) throw new Error('falha simulada');
      return [];
    });
    await assert.rejects(falha.coletarTeste(), /exportação foi cancelada sem criar arquivo parcial/);
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
      assert.match(html, /exportação foi cancelada sem criar arquivo parcial/);
      assert.match(html, /async function carregarMaisConversas\(\)/);
      assert.match(html, /api\(caminhoListaAberta\(proximaPagina\)\)/);
      assert.match(html, /mais\.id = 'card-mais'/);
      assert.match(html, /mais\.setAttribute\('role', 'button'\)/);
      assert.match(html, /salvarListaAtualEmCache\(\);/);
      assert.doesNotMatch(html, /await salvarListaAtualEmCache\(\)/);
      assert.match(html, /revisao !== revisaoLista/);
      assert.match(html, /div\.id === 'card-nova' \|\| div\.id === 'card-mais'/);
      assert.match(html, /comentariosRecentes\(numero, issue && issue\.comments\)/);
      assert.match(html, /avisoHistoricoParcial\(issue\.comments, comentarios\.length\)/);
      assert.doesNotMatch(html, /comments\?per_page=100/);
    });
  }
  console.log(`${certos}/${certos + falhas} testes de paginação de conversas passaram`);
  process.exitCode = falhas ? 1 : 0;
}
main().catch((e) => { console.error(e.stack || e.message); process.exitCode = 1; });
