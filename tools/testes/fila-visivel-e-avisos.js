// FILA VISÍVEL e AVISO ≠ CONVERSA (31/10/2026) — duas esperas cegas que foram medidas.
//
// 1) A tela dizia "aguardando resposta…" e não dizia HÁ QUANTO TEMPO. O dono não sabia se
//    esperava 20 s ou 3 h e reenviava — o reenvio cria conversa nova e polui a lista.
//    Agora a linha da fila é executada de verdade aqui: relógio andando, faixas medidas.
// 2) Na lista, 30 de 31 cartões eram avisos que a casa publica sozinha; a conversa do dono
//    ficava enterrada. Agora o cartão de aviso se identifica e vai para o fim.
// 3) `acordarMotor` mandava `workflow_dispatch` sem o número da conversa. O motor escuta
//    `repository_dispatch` do tipo `mensagem` — é o único que leva o número.
//
// Offline: não abre rede, GitHub, token, conta ou navegador.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0;
let falhas = 0;
const pendentes = [];
function testa(nome, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      pendentes.push(r.then(() => { certos++; console.log('✔ ' + nome); },
        (erro) => { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }));
      return;
    }
    certos++; console.log('✔ ' + nome);
  } catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function fonte(rota) { return fs.readFileSync(path.join(raiz, rota), 'utf8'); }

function trecho(src, inicio, fim) {
  const i = src.indexOf(inicio);
  const f = src.indexOf(fim, i);
  assert(i >= 0 && f > i, 'trecho ausente: ' + inicio);
  return src.slice(i, f);
}

testa('nenhum link simbólico node_modules é versionado (derruba a publicação do Pages)', () => {
  const alvo = path.join(raiz, 'node_modules');
  let st = null;
  try { st = fs.lstatSync(alvo); } catch (e) { return; }  // ausente é o estado normal no CI
  assert(!st.isSymbolicLink(), 'node_modules é um link simbólico: o tar do Pages falha e a '
    + 'página para de ser publicada. Apague o link (npm ci cria o diretório de verdade).');
});

// ---------------------------------------------------------------- fila visível (executada)
function runtimeDaFila(src) {
  const bloco = trecho(src,
    'const FILA_MEDIDA = Object.freeze(',
    'const LIMITE_MENSAGEM_COMPOSITOR');
  const intervalo = { fn: null, limpou: 0 };
  const removidos = [];
  const ctx = {
    Object, Number, Date, Math, String, clearInterval: () => { intervalo.limpou++; intervalo.fn = null; },
    setInterval: (fn) => { intervalo.fn = fn; return 1; },
    escapar: (t) => String(t),
    rolarFim: () => {},
    elMsgs: { appendChild: (el) => removidos.push(el) && el },
    document: {
      getElementById: () => null,
      createElement: () => ({ id: '', className: '', innerHTML: '', attrs: {}, style: {},
        setAttribute(k, v) { this.attrs[k] = v; }, remove() {} })
    },
    $: (id) => (id === 'pensando' ? (ctx.__atual || null) : null)
  };
  vm.createContext(ctx);
  vm.runInContext(bloco + '\nglobalThis.linha = linhaDaFila; globalThis.curta = duracaoCurta; '
    + 'globalThis.FILA_MEDIDA = FILA_MEDIDA;', ctx);
  const original = ctx.document.createElement;
  ctx.document.createElement = () => { const el = original(); ctx.__atual = el; return el; };
  return { ctx, intervalo, removidos };
}

const srcIndex = fonte('index.html');

testa('a faixa da fila é medida, não inventada', () => {
  const { ctx } = runtimeDaFila(srcIndex);
  assert.equal(ctx.FILA_MEDIDA.acordado_s, 120, 'o típico com o motor acordado é ~2 min');
  assert.equal(ctx.FILA_MEDIDA.mediana_s, 11910, 'mediana medida: 198,5 min');
  assert.equal(ctx.FILA_MEDIDA.p90_s, 22740, 'p90 medido: 379 min');
  assert.equal(ctx.curta(42), '42 s');
  assert.equal(ctx.curta(90), '1 min 30 s');
  assert.equal(ctx.curta(11910), '3 h 18 min');  // 198,5 min: 18 min e 30 s truncados
});

testa('a fila diz há quanto tempo está esperando, em três faixas', () => {
  const { ctx } = runtimeDaFila(srcIndex);
  const cedo = ctx.linha(20);
  const meio = ctx.linha(3600);
  const tarde = ctx.linha(30000);
  assert.match(cedo, /na fila há 20 s/);
  assert.match(cedo, /típico ~2 min/);
  assert.match(meio, /na fila há 1 h 0 min/);
  assert.match(meio, /mediana medida é 198,5 min/);
  assert.match(tarde, /acima do p90 medido/);
});

testa('o relógio da fila anda na tela e para quando a espera acaba', () => {
  const { ctx, intervalo, removidos } = runtimeDaFila(srcIndex);
  let agora = 1000000;
  ctx.Date = { now: () => agora };
  vm.runInContext('globalThis.Date = Date;', ctx);
  vm.runInContext('globalThis.mostrar = pensando;', ctx);
  ctx.mostrar(true, 'aguardando resposta…');
  assert(intervalo.fn, 'o relógio precisa ser iniciado');
  assert.equal(intervalo.fn.length, 0);
  const alvo = removidos[removidos.length - 1];
  assert.match(alvo.innerHTML, /na fila há 0 s/);
  agora += 65000;
  intervalo.fn();
  assert.match(alvo.innerHTML, /na fila há 1 min 5 s/);
  ctx.__atual = alvo;
  ctx.mostrar(false);
  assert.equal(intervalo.limpou, 1, 'ao encerrar, o relógio é desligado');
});

// ---------------------------------------------------------------- aviso ≠ conversa (executada)
function runtimeDosCartoes(src) {
  const bloco = trecho(src, 'function criarCartaoConversa(i) {', 'function criarCartaoNova() {');
  const novo = () => ({
    tag: '', className: '', id: '', innerHTML: '', textContent: '', dataset: {}, style: {}, attrs: {},
    children: [], classList: { _s: new Set(), add(c) { this._s.add(c); }, contains(c) { return this._s.has(c); } },
    setAttribute(k, v) { this.attrs[k] = v; }, appendChild(e) { this.children.push(e); return e; }
  });
  const ctx = {
    Number, String, console,
    document: { createElement: novo },
    escapar: (t) => String(t),
    quando: () => 'agora',
    abrir: () => {},
    conversaEhFavorita: () => false,
    estadoOrganizacaoConversas: () => 'pronto',
    backupFavoritosEmAndamento: false,
    idColecaoSelecionada: () => '',
    nomeColecaoSelecionada: () => '',
    conversaEstaNaColecao: () => false,
    estadoColecoesConversas: () => 'pronto',
    alternarFavoritoDaConversa: () => {},
    alternarConversaDaColecao: () => {}
  };
  vm.createContext(ctx);
  vm.runInContext(bloco + '\nglobalThis.cartao = criarCartaoConversa;', ctx);
  return ctx;
}

testa('o cartão de aviso da casa se identifica e não se disfarça de conversa', () => {
  const ctx = runtimeDosCartoes(srcIndex);
  const aviso = ctx.cartao({ number: 72, title: '🔔 Boletim diário', comments: 3,
    updated_at: '2026-10-30T12:00:00Z', labels: [{ name: 'aviso' }] });
  assert(aviso.classList.contains('conv-aviso-casa'), 'o aviso precisa de marca própria');
  assert.equal(aviso.dataset.avisoCasa, '1');
  const abrir = aviso.children[0];
  assert.match(abrir.innerHTML, /📣 aviso da casa/);
  assert.doesNotMatch(abrir.innerHTML, /💬 3/);
  assert.match(abrir.attrs['aria-label'], /^Abrir aviso da casa/);
});

testa('a conversa do dono continua sendo conversa', () => {
  const ctx = runtimeDosCartoes(srcIndex);
  const conversa = ctx.cartao({ number: 75, title: 'Roadmap', comments: 4,
    updated_at: '2026-10-31T01:00:00Z', labels: [] });
  assert(!conversa.classList.contains('conv-aviso-casa'));
  assert.equal(conversa.dataset.avisoCasa, undefined);
  assert.match(conversa.children[0].innerHTML, /💬 4/);
  assert.match(conversa.children[0].attrs['aria-label'], /^Abrir conversa/);
});

testa('a rotina da casa continua marcada como rotina', () => {
  const ctx = runtimeDosCartoes(srcIndex);
  const rotina = ctx.cartao({ number: 73, title: 'Rotina da noite', comments: 3,
    updated_at: '2026-10-30T23:00:00Z', labels: [{ name: 'rotina' }] });
  assert.match(rotina.children[0].innerHTML, /📋 Rotina da noite/);
  assert(!rotina.classList.contains('conv-aviso-casa'));
});

testa('a lista coloca as conversas do dono antes dos avisos da casa', () => {
  const src = srcIndex;
  const bloco = trecho(src, 'function renderListaAtual(offline = false) {', '\nasync function carregarLista()');
  const ordem = [];
  const ctx = {
    listaAtual: [], listaRenderizada: false, listaOffline: false,
    maisListaDisponivel: false, elFaixa: { textContent: '' },
    elLista: { innerHTML: '', appendChild(e) { ordem.push(e.rotulo || 'cartao'); return e; } },
    criarCartaoConversa: (i) => ({ rotulo: 'item:' + i.number }),
    criarCartaoMais: () => ({ rotulo: 'mais' }),
    criarCartaoNova: () => ({ rotulo: 'nova' }),
    aplicarFiltroLista: () => {}
  };
  vm.createContext(ctx);
  vm.runInContext(bloco + '\nglobalThis.render = renderListaAtual;', ctx);
  ctx.listaAtual = [
    { number: 72, labels: [{ name: 'aviso' }] },
    { number: 75, labels: [] },
    { number: 71, labels: [{ name: 'aviso' }] },
    { number: 74, labels: [] }
  ];
  vm.runInContext('globalThis.render(false);', ctx);
  assert.deepEqual(ordem.slice(0, 4), ['item:75', 'item:74', 'item:72', 'item:71']);
  assert.match(ctx.elFaixa.textContent, /2 conversas · 2 avisos da casa/);
});

// ---------------------------------------------------------------- acordarMotor (executada)
function runtimeDoAcordar(src) {
  const bloco = trecho(src, 'async function acordarMotor(numero) {', '\n\nasync function enviar() {');
  const chamadas = [];
  let falharPrimeiro = false;
  const ctx = {
    Number, JSON, String, console,
    MODO_LOCAL: { ligado: false },
    api: async (caminho, opcoes) => {
      chamadas.push({ caminho, corpo: JSON.parse((opcoes && opcoes.body) || '{}') });
      if (falharPrimeiro && chamadas.length === 1) throw new Error('sem permissão');
      return { ok: true, status: 204 };
    },
    atualizarEstadoEntrega: (estado) => chamadas.push({ estado }),
    setFalhar: (v) => { falharPrimeiro = v; }
  };
  vm.createContext(ctx);
  vm.runInContext(bloco + '\nglobalThis.acordar = acordarMotor;', ctx);
  return { ctx, chamadas };
}

const rotasFonte = Object.fromEntries(rotas.map((r) => [r, fonte(r)]));

for (const rota of rotas) {
  testa(rota + ': acordar o motor leva o número da conversa', async () => {
    const { ctx, chamadas } = runtimeDoAcordar(rotasFonte[rota]);
    await ctx.acordar(75);
    assert.equal(chamadas.length, 2, 'um dispatch + um estado de entrega');
    assert.equal(chamadas[0].caminho, '/repos/reboclbrank-max/motor/dispatches');
    assert.equal(chamadas[0].corpo.event_type, 'mensagem');
    assert.equal(chamadas[0].corpo.client_payload.conversa, 75);
    assert.equal(chamadas[1].estado, 'resposta-acelerada');
  });
}

testa('sem permissão para repository_dispatch, o workflow_dispatch ainda acorda o motor', async () => {
  const { ctx, chamadas } = runtimeDoAcordar(srcIndex);
  ctx.setFalhar(true);
  await ctx.acordar(75);
  const alvos = chamadas.filter((c) => c.caminho).map((c) => c.caminho);
  assert.deepEqual(alvos, [
    '/repos/reboclbrank-max/motor/dispatches',
    '/repos/reboclbrank-max/motor/actions/workflows/chat.yml/dispatches'
  ]);
  assert.deepEqual(chamadas.find((c) => c.caminho && c.caminho.includes('workflows')).corpo, { ref: 'main' });
  assert(chamadas.some((c) => c.estado === 'resposta-acelerada'), 'a tela precisa saber que acelerou');
});

testa('o estado "resposta-acelerada" existe e diz o tempo medido', () => {
  for (const rota of rotas) {
    const src = rotasFonte[rota];
    assert.match(src, /'resposta-acelerada': 'Motor acordado agora; a resposta típica sai em ~2 min/);
  }
});

Promise.all(pendentes).then(() => {
  console.log('');
  if (falhas) {
    console.error(falhas + ' de ' + (certos + falhas) + ' verificações da fila/avisos FALHARAM');
    process.exitCode = 1;
    return;
  }
  console.log(certos + '/' + certos + ' verificações da fila/avisos passaram');
});
