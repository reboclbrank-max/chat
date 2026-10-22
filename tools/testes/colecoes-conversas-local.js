// Contrato de coleções locais: nomes escolhidos e IDs, sem transporte, título ou conteúdo de conversa.
'use strict';
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
const fonte = fs.readFileSync(path.join(raiz, 'chat-colecoes-local.js'), 'utf8');
let certos = 0, falhas = 0;
const pendentes = [];
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function testaAsync(nome, fn) {
  const pendente = Promise.resolve().then(fn)
    .then(() => { certos++; console.log('✔ ' + nome); })
    .catch((erro) => { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); });
  pendentes.push(pendente);
  return pendente;
}
function ler(nome) { return fs.readFileSync(path.join(raiz, nome), 'utf8'); }
function entre(texto, inicio, fim) {
  const a = texto.indexOf(inicio), b = texto.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho ausente: ' + inicio);
  return texto.slice(a, b);
}

function criarIndexedDbFalso() {
  const stores = new Map([
    ['colecoes', new Map()],
    ['itens', new Map()]
  ]);
  let colecoesCriada = false;
  let itensCriada = false;
  const copiar = (item) => Object.assign({}, item);
  const chaveDaLoja = (nome, item) => nome === 'colecoes' ? item.id : item.chave;
  const db = {
    objectStoreNames: {
      contains(nome) {
        return nome === 'colecoes' ? colecoesCriada : nome === 'itens' ? itensCriada : false;
      }
    },
    createObjectStore(nome) {
      assert(['colecoes', 'itens'].includes(nome));
      if (nome === 'colecoes') colecoesCriada = true;
      if (nome === 'itens') itensCriada = true;
      return {};
    },
    transaction(nomes, modo) {
      const esperados = Array.isArray(nomes) ? nomes.slice().sort() : [nomes];
      assert.deepEqual(esperados, ['colecoes', 'itens']);
      assert(['readonly', 'readwrite'].includes(modo));
      const tx = { oncomplete: null, onerror: null, onabort: null };
      let pendentes = 0;
      let fimAgendado = false;
      function tentarConcluir() {
        if (pendentes || fimAgendado) return;
        fimAgendado = true;
        setImmediate(() => { if (!pendentes && typeof tx.oncomplete === 'function') tx.oncomplete(); });
      }
      function agendar(fn) {
        pendentes++;
        setImmediate(() => {
          try { fn(); }
          catch (erro) { if (typeof tx.onerror === 'function') tx.onerror(erro); }
          pendentes--;
          tentarConcluir();
        });
      }
      tx.objectStore = (nome) => {
        assert(['colecoes', 'itens'].includes(nome));
        const registros = stores.get(nome);
        return {
          getAll() {
            const pedido = { onsuccess: null, onerror: null, result: null };
            agendar(() => {
              pedido.result = [...registros.values()].map(copiar);
              if (typeof pedido.onsuccess === 'function') pedido.onsuccess();
            });
            return pedido;
          },
          put(item) { agendar(() => registros.set(chaveDaLoja(nome, item), copiar(item))); },
          delete(chave) { agendar(() => registros.delete(chave)); },
          clear() { agendar(() => registros.clear()); }
        };
      };
      setImmediate(tentarConcluir);
      return tx;
    }
  };
  return {
    stores,
    indexedDB: {
      open(nome, versao) {
        assert.equal(nome, 'rebocl-colecoes-conversas-v1');
        assert.equal(versao, 1);
        const pedido = { onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null, result: db };
        setImmediate(() => {
          if (typeof pedido.onupgradeneeded === 'function') pedido.onupgradeneeded();
          if (typeof pedido.onsuccess === 'function') pedido.onsuccess();
        });
        return pedido;
      }
    }
  };
}

function runtimeColecoes(comBanco = true, bancoReutilizavel = null) {
  const eventos = [];
  const banco = comBanco ? (bancoReutilizavel || criarIndexedDbFalso()) : null;
  class EventoControlado {
    constructor(tipo, opcoes) { this.type = tipo; this.detail = opcoes && opcoes.detail; }
  }
  const document = {
    dispatchEvent(evento) { eventos.push(evento); return true; },
    createEvent() { return { initCustomEvent(tipo, bolhas, cancelavel, detalhe) { this.type = tipo; this.detail = detalhe; } }; }
  };
  const contexto = {
    window: {}, document, CustomEvent: EventoControlado,
    Promise, Object, Number, String, Array, Map, Set, Error, Math,
    indexedDB: banco && banco.indexedDB,
    setImmediate
  };
  vm.createContext(contexto);
  vm.runInContext(fonte, contexto);
  return { api: contexto.window.ReboclColecoesConversas, eventos, stores: banco && banco.stores };
}

testa('módulo usa banco separado, limites explícitos e não introduz rede ou storage legado', () => {
  assert.match(fonte, /const BANCO = 'rebocl-colecoes-conversas-v1'/);
  assert.match(fonte, /const LOJA_COLECOES = 'colecoes'/);
  assert.match(fonte, /const LOJA_ITENS = 'itens'/);
  assert.match(fonte, /const LIMITE_COLECOES = 20/);
  assert.match(fonte, /const LIMITE_NOME = 48/);
  assert.match(fonte, /const LIMITE_ITENS_COLECAO = 100/);
  assert.match(fonte, /const LIMITE_ITENS_TOTAL = 400/);
  assert.match(fonte, /const FORMATO_BACKUP = 'rebocl-colecoes-conversas'/);
  assert.match(fonte, /const VERSAO_BACKUP = 1/);
  assert.match(fonte, /const LIMITE_BACKUP_BYTES = 128 \* 1024/);
  assert.match(fonte, /indexedDB\.open\(BANCO, VERSAO_BANCO\)/);
  assert.doesNotMatch(fonte, /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(?/);
  assert.doesNotMatch(fonte, /\b(localStorage|sessionStorage|Authorization|github_pat_|gh[pousr]_)\b/i);
  assert.doesNotMatch(fonte, /https?:\/\//i);
});

testaAsync('cria, renomeia, associa e apaga coleção sem guardar título, mensagem ou token', async () => {
  const r = runtimeColecoes(true);
  const inicio = await r.api.pronto();
  assert.deepEqual(Object.keys(inicio).sort(), ['colecoes', 'estado', 'itens', 'limiteColecoes', 'limiteItensPorColecao', 'limiteItensTotal']);
  assert.equal(inicio.estado, 'pronto');
  const criada = await r.api.criarColecao('  Trabalho   importante  ');
  assert.deepEqual(criada, { id: 1, nome: 'Trabalho importante', quantidade: 0 });
  await r.api.renomearColecao(1, 'Projetos');
  assert.equal(await r.api.alternarConversa(1, 42), true);
  assert.equal(r.api.temConversa(1, 42), true);
  assert.deepEqual([...r.stores.get('colecoes').values()], [{ id: 1, nome: 'Projetos' }]);
  assert.deepEqual([...r.stores.get('itens').values()], [{ chave: '1:42', colecao: 1, numero: 42 }]);
  const serializado = JSON.stringify([...r.stores.get('itens').values()]);
  assert(!/titulo|mensagem|conteudo|token/i.test(serializado), 'associação não contém conteúdo de conversa');
  await r.api.apagarColecao(1);
  assert.equal(r.api.detalhe().colecoes, 0);
  assert.equal(r.stores.get('colecoes').size, 0);
  assert.equal(r.stores.get('itens').size, 0);
  for (const evento of r.eventos) {
    assert(!Object.prototype.hasOwnProperty.call(evento.detail || {}, 'nome'), 'evento não expõe nome local');
    assert(!Object.prototype.hasOwnProperty.call(evento.detail || {}, 'id'), 'evento não expõe IDs');
    assert(!Object.prototype.hasOwnProperty.call(evento.detail || {}, 'numero'), 'evento não expõe números');
  }
});

testaAsync('nova instância relê coleção e associação mínimas do mesmo banco local', async () => {
  const banco = criarIndexedDbFalso();
  const primeira = runtimeColecoes(true, banco);
  await primeira.api.pronto();
  await primeira.api.criarColecao('Acompanhar');
  await primeira.api.alternarConversa(1, 77);
  const segunda = runtimeColecoes(true, banco);
  const detalhe = await segunda.api.pronto();
  assert.deepEqual(segunda.api.listarColecoes(), [{ id: 1, nome: 'Acompanhar', quantidade: 1 }]);
  assert.equal(segunda.api.temConversa(1, 77), true);
  assert.equal(detalhe.itens, 1);
});

testaAsync('valida nomes, duplicatas, limites e entradas inválidas antes de guardar associações extras', async () => {
  const r = runtimeColecoes(true);
  await r.api.pronto();
  await assert.rejects(() => r.api.criarColecao('   '), (erro) => erro && erro.codigo === 'nome-colecao-invalido');
  await r.api.criarColecao('Leitura');
  await assert.rejects(() => r.api.criarColecao('leitura'), (erro) => erro && erro.codigo === 'colecao-duplicada');
  await assert.rejects(() => r.api.alternarConversa(0, 1), (erro) => erro && erro.codigo === 'colecao-invalida');
  await assert.rejects(() => r.api.alternarConversa(1, 0), (erro) => erro && erro.codigo === 'conversa-invalida');
  for (let numero = 1; numero <= 100; numero++) await r.api.alternarConversa(1, numero);
  await assert.rejects(() => r.api.alternarConversa(1, 101), (erro) => erro && erro.codigo === 'limite-itens-colecao');
  for (let indice = 2; indice <= 20; indice++) await r.api.criarColecao('Coleção ' + indice);
  await assert.rejects(() => r.api.criarColecao('Excesso'), (erro) => erro && erro.codigo === 'limite-colecoes');
  assert.equal(r.stores.get('itens').size, 100);
  assert.equal(r.stores.get('colecoes').size, 20);
});

testaAsync('limpeza explícita remove apenas o banco das coleções locais', async () => {
  const r = runtimeColecoes(true);
  await r.api.pronto();
  await r.api.criarColecao('Temporária');
  await r.api.alternarConversa(1, 8);
  await r.api.limparColecoes();
  assert.equal(r.api.detalhe().colecoes, 0);
  assert.equal(r.api.detalhe().itens, 0);
  assert.equal(r.stores.get('colecoes').size, 0);
  assert.equal(r.stores.get('itens').size, 0);
});

testaAsync('exporta um backup mínimo, valida esquema estrito e restaura substituindo apenas as coleções locais', async () => {
  const banco = criarIndexedDbFalso();
  const r = runtimeColecoes(true, banco);
  await r.api.pronto();
  await r.api.criarColecao('  Zeta  ');
  await r.api.alternarConversa(1, 9);
  await r.api.alternarConversa(1, 3);
  await r.api.criarColecao('Alpha');
  await r.api.alternarConversa(2, 72);
  const backup = await r.api.exportarBackup();
  assert.deepEqual(backup, {
    formato: 'rebocl-colecoes-conversas',
    versao: 1,
    colecoes: [
      { nome: 'Alpha', numeros: [72] },
      { nome: 'Zeta', numeros: [3, 9] }
    ]
  });
  const serializado = JSON.stringify(backup);
  assert(!/titulo|mensagem|conteudo|token|github|http/i.test(serializado), 'backup não carrega conteúdo, token ou transporte');
  assert.deepEqual(r.api.limitesBackup(), { formato: 'rebocl-colecoes-conversas', versao: 1, bytes: 131072 });
  assert.throws(() => r.api.validarBackup({ formato: 'rebocl-colecoes-conversas', versao: 1, colecoes: [], extra: true }), (erro) => erro && erro.codigo === 'backup-invalido');
  assert.throws(() => r.api.validarBackup({ formato: 'rebocl-colecoes-conversas', versao: '1', colecoes: [] }), (erro) => erro && erro.codigo === 'backup-incompativel');
  assert.throws(() => r.api.validarBackup({ formato: 'rebocl-colecoes-conversas', versao: 1, colecoes: [{ nome: 'Duplicada', numeros: [3, 3] }] }), (erro) => erro && erro.codigo === 'backup-invalido');
  assert.throws(() => r.api.validarBackup({ formato: 'rebocl-colecoes-conversas', versao: 1, colecoes: [{ nome: 'Tipo', numeros: ['4'] }] }), (erro) => erro && erro.codigo === 'backup-invalido');
  await assert.rejects(() => r.api.substituirBackup({ formato: 'rebocl-colecoes-conversas', versao: 1, colecoes: [{ nome: '', numeros: [] }] }), (erro) => erro && erro.codigo === 'backup-invalido');
  assert.equal(r.api.temConversa(1, 9), true, 'backup inválido não altera o estado anterior');
  const normalizado = r.api.validarBackup({
    formato: 'rebocl-colecoes-conversas',
    versao: 1,
    colecoes: [{ nome: '  Restaurada  ', numeros: [40, 4] }, { nome: 'Outra', numeros: [] }]
  });
  await r.api.substituirBackup(normalizado);
  assert.deepEqual(r.api.listarColecoes(), [
    { id: 1, nome: 'Outra', quantidade: 0 },
    { id: 2, nome: 'Restaurada', quantidade: 2 }
  ]);
  assert.equal(r.api.temConversa(1, 9), false);
  assert.equal(r.api.temConversa(2, 4), true);
  assert.equal(r.api.temConversa(2, 40), true);
  assert.deepEqual([...r.stores.get('colecoes').values()], [{ id: 1, nome: 'Outra' }, { id: 2, nome: 'Restaurada' }]);
  assert.deepEqual([...r.stores.get('itens').values()], [
    { chave: '2:4', colecao: 2, numero: 4 },
    { chave: '2:40', colecao: 2, numero: 40 }
  ]);
  const relida = runtimeColecoes(true, banco);
  await relida.api.pronto();
  assert.deepEqual(await relida.api.exportarBackup(), {
    formato: 'rebocl-colecoes-conversas', versao: 1,
    colecoes: [{ nome: 'Outra', numeros: [] }, { nome: 'Restaurada', numeros: [4, 40] }]
  });
});

testaAsync('sem IndexedDB falha fechada, sem fallback para rede ou storage legado', async () => {
  const r = runtimeColecoes(false);
  await assert.rejects(() => r.api.pronto(), (erro) => erro && erro.codigo === 'armazenamento-indisponivel');
  assert.equal(r.api.estado(), 'falhou');
  assert.deepEqual(r.api.listarColecoes(), []);
  assert.equal(r.eventos.some((evento) => evento.type === 'rebocl-colecoes-conversas-falhou'), true);
});

testa('quatro rotas carregam ativo local e preservam coleções, controles e paridade visual', () => {
  const blocos = [];
  for (const rota of rotas) {
    const html = ler(rota);
    assert.equal((html.match(/chat-colecoes-local\.js/g) || []).length, 1, rota + ': ativo duplicado');
    assert.match(html, /<script src="chat-colecoes-local\.js"><\/script>/);
    const organizacao = html.indexOf('<script src="chat-organizacao-local.js"></script>');
    const colecoes = html.indexOf('<script src="chat-colecoes-local.js"></script>');
    const workspace = html.indexOf('<script src="chat-workspace.js"></script>');
    const inline = html.indexOf('<script>', workspace);
    assert(organizacao >= 0 && colecoes > organizacao && workspace > colecoes && inline > workspace, rota + ': ativo local precisa preceder código da rota');
    assert.match(html, /id="seletor-colecao" disabled/);
    assert.match(html, /id="btn-filtrar-colecao" aria-pressed="false" disabled/);
    assert.match(html, /id="btn-criar-colecao" disabled/);
    assert.match(html, /id="btn-apagar-colecoes" disabled/);
    assert.match(html, /id="btn-exportar-colecoes" disabled/);
    assert.match(html, /id="btn-importar-colecoes" disabled/);
    assert.match(html, /id="arq-importar-colecoes" accept="application\/json,\.json" class="oculto" disabled/);
    assert.match(html, /Backup manual das coleções locais/);
    assert.match(html, /Restaurar é uma escolha sua e substitui todas as coleções deste navegador após confirmação/);
    assert.match(html, /function exportarBackupColecoesLocais\(\)/);
    assert.match(html, /function importarBackupColecoesLocais\(arquivo\)/);
    assert.match(html, /colecoes\.validarBackup\(JSON\.parse\(texto\)\)/);
    assert.match(html, /if \(tamanho > limites\.bytes\) throw erroBackupColecoes\('backup-grande'\);/);
    assert.match(html, /backupColecoesEmAndamento = true;/);
    assert.match(html, /colecoes\.substituirBackup\(backup\)/);
    assert.match(html, /Isso substituirá todas as coleções locais atuais deste navegador/);
    assert.match(html, /nome que você escolheu e os números das conversas associadas neste navegador/i);
    assert.match(html, /function criarColecaoLocal\(\)/);
    assert.match(html, /function limparColecoesLocais\(\)/);
    assert.match(html, /Apagar todas as coleções e associações salvas neste navegador\?/);
    assert.match(html, /className = 'conv-colecao'/);
    assert.match(html, /Escolha uma coleção local antes de organizar esta conversa/);
    assert.match(html, /evento\.stopPropagation\(\)/);
    assert.match(html, /const somenteColecao = filtroColecaoAtivo/);
    assert.match(html, /Nenhuma conversa desta coleção entre as conversas carregadas/);
    const bloco = entre(html, '/* ---------- organização local de conversas ---------- */', '\nasync function novaConversa');
    blocos.push(bloco);
  }
  const hashes = blocos.map((bloco) => crypto.createHash('sha256').update(bloco).digest('hex'));
  assert.equal(new Set(hashes).size, 1, 'quatro rotas precisam manter coleções locais idênticas');
});

testa('limpezas existentes permanecem estreitas e coleções declaram suas preservações', () => {
  for (const rota of rotas) {
    const html = ler(rota);
    const limpeza = entre(html, 'async function limparCopiasOffline()', '\n\n/* ---------- sugestões');
    assert.doesNotMatch(limpeza, /limparColecoes|rebocl-colecoes-conversas/);
    assert.match(html, /token, cópias offline, favoritos nem o Workspace/);
  }
});

testa('casca, workflow, corredor e continuidade observam o novo ativo', () => {
  const sw = ler('sw.js');
  const workflow = ler('.github/workflows/testes-rapidos.yml');
  const corredor = ler('tools/testes/roda-testes.js');
  const continuidade = ler('tools/testes/continuidade.js');
  assert.match(sw, /rebocl-chat-v89/);
  assert.match(sw, /'\.\/chat-colecoes-local\.js'/);
  assert.match(workflow, /'chat-colecoes-local\.js'/);
  assert.match(corredor, /'colecoes-conversas-local\.js'/);
  assert(continuidade.includes('chat-colecoes-local\\.js'), 'porta não observa ativo novo');
});

testa('estilos mantêm três controles nativos, gestão legível e layout responsivo', () => {
  const css = ler('chat-estilos.css');
  assert.match(css, /#seletor-colecao\{flex:0 1 190px;min-width:110px;min-height:40px/);
  assert.match(css, /\.conv-favorita,\.conv-colecao\{flex:0 0 44px;min-width:44px;min-height:44px/);
  assert.match(css, /\.colecoes-nova\{display:flex;gap:8px;align-items:stretch\}/);
  assert.match(css, /\.backup-local\{margin-top:12px;padding:10px;border:1px solid var\(--borda\)/);
  assert.match(css, /\.backup-local-acoes\{display:flex;gap:8px;align-items:stretch;margin-top:9px\}/);
  assert.match(css, /\.colecao-local-acoes\{display:flex;gap:6px;align-items:stretch\}/);
  assert.match(css, /@media \(max-width:600px\)\{\.busca-organizacao\{flex-wrap:wrap\}/);
});

(async function principal() {
  await Promise.all(pendentes);
  console.log(`${certos}/${certos + falhas} testes de coleções locais passaram`);
  process.exitCode = falhas ? 1 : 0;
})();
