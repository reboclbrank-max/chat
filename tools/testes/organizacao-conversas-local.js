// Contrato dos favoritos locais de conversa: somente IDs, sem transporte e com remoção explícita.
'use strict';
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
const fonte = fs.readFileSync(path.join(raiz, 'chat-organizacao-local.js'), 'utf8');
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
  const registros = new Map();
  let lojaCriada = false;
  const copiar = (item) => Object.assign({}, item);
  const db = {
    objectStoreNames: { contains: (nome) => lojaCriada && nome === 'favoritos' },
    createObjectStore(nome) { assert.equal(nome, 'favoritos'); lojaCriada = true; return {}; },
    transaction(nome, modo) {
      assert.equal(nome, 'favoritos');
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
      tx.objectStore = () => ({
        getAll() {
          const pedido = { onsuccess: null, onerror: null, result: null };
          agendar(() => { pedido.result = [...registros.values()].map(copiar); if (typeof pedido.onsuccess === 'function') pedido.onsuccess(); });
          return pedido;
        },
        put(item) { agendar(() => registros.set(item.numero, copiar(item))); },
        delete(numero) { agendar(() => registros.delete(numero)); },
        clear() { agendar(() => registros.clear()); }
      });
      setImmediate(tentarConcluir);
      return tx;
    }
  };
  return {
    registros,
    indexedDB: {
      open(nome, versao) {
        assert.equal(nome, 'rebocl-organizacao-conversas-v1');
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
function runtimeOrganizacao(comBanco = true, bancoReutilizavel = null) {
  const eventos = [];
  const ouvintes = {};
  const banco = comBanco ? (bancoReutilizavel || criarIndexedDbFalso()) : null;
  class EventoControlado {
    constructor(tipo, opcoes) { this.type = tipo; this.detail = opcoes && opcoes.detail; }
  }
  const document = {
    addEventListener(tipo, fn) { (ouvintes[tipo] || (ouvintes[tipo] = [])).push(fn); },
    dispatchEvent(evento) { eventos.push(evento); (ouvintes[evento.type] || []).forEach((fn) => fn(evento)); return true; },
    createEvent() { return { initCustomEvent(tipo, bolhas, cancelavel, detalhe) { this.type = tipo; this.detail = detalhe; } }; }
  };
  const contexto = {
    window: {}, document, CustomEvent: EventoControlado,
    Promise, Object, Number, String, Array, Set, Error, Math,
    indexedDB: banco && banco.indexedDB,
    setImmediate
  };
  vm.createContext(contexto);
  vm.runInContext(fonte, contexto);
  return { api: contexto.window.ReboclOrganizacaoConversas, eventos, registros: banco && banco.registros };
}

testa('módulo usa banco separado, limite explícito e não introduz rede ou storage legado', () => {
  assert.match(fonte, /const BANCO = 'rebocl-organizacao-conversas-v1'/);
  assert.match(fonte, /const LOJA = 'favoritos'/);
  assert.match(fonte, /const LIMITE_FAVORITOS = 100/);
  assert.match(fonte, /const FORMATO_BACKUP = 'rebocl-favoritos-conversas'/);
  assert.match(fonte, /const VERSAO_BACKUP = 1/);
  assert.match(fonte, /const LIMITE_BACKUP_BYTES = 32 \* 1024/);
  assert.match(fonte, /indexedDB\.open\(BANCO, VERSAO_BANCO\)/);
  assert.match(fonte, /loja\.put\(\{ numero \}\)/);
  assert.doesNotMatch(fonte, /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(?/);
  assert.doesNotMatch(fonte, /\b(localStorage|sessionStorage|Authorization|github_pat_|gh[pousr]_)\b/i);
  assert.doesNotMatch(fonte, /https?:\/\//i);
});

testa('dados persistidos são somente IDs numéricos, não títulos nem conteúdo', () => {
  assert.doesNotMatch(entre(fonte, 'function gravar(acao, numero) {', '\n  function iniciar()'), /titulo|title|conteudo|content|mensagem|message/i);
  assert.match(fonte, /if \(!Number\.isSafeInteger\(numero\) \|\| numero < 1\)/);
  assert.match(fonte, /function temFavorito\(numero\)/);
});

testaAsync('favorita, remove e apaga em IndexedDB controlado sem expor a lista por evento', async () => {
  const r = runtimeOrganizacao(true);
  const inicio = await r.api.pronto();
  assert.deepEqual(Object.keys(inicio).sort(), ['estado', 'limite', 'quantidade']);
  assert.equal(inicio.estado, 'pronto');
  assert.equal(r.api.temFavorito(17), false);
  assert.equal(await r.api.alternarFavorito(17), true);
  assert.equal(r.api.temFavorito(17), true);
  assert.deepEqual([...r.registros.values()], [{ numero: 17 }]);
  assert.equal(await r.api.alternarFavorito(17), false);
  assert.equal(r.api.temFavorito(17), false);
  await r.api.alternarFavorito(42);
  await r.api.limparFavoritos();
  assert.equal(r.api.detalhe().quantidade, 0);
  assert.equal(r.registros.size, 0);
  for (const evento of r.eventos) {
    assert(!Object.prototype.hasOwnProperty.call(evento.detail || {}, 'numeros'), 'evento não expõe IDs');
    assert(!Object.prototype.hasOwnProperty.call(evento.detail || {}, 'titulo'), 'evento não expõe título');
  }
});

testaAsync('nova instância lê somente o ID favorito já persistido no banco local', async () => {
  const banco = criarIndexedDbFalso();
  const primeira = runtimeOrganizacao(true, banco);
  await primeira.api.pronto();
  await primeira.api.alternarFavorito(77);
  const segunda = runtimeOrganizacao(true, banco);
  const detalhe = await segunda.api.pronto();
  assert.equal(segunda.api.temFavorito(77), true);
  assert.equal(detalhe.quantidade, 1);
  assert.deepEqual([...banco.registros.values()], [{ numero: 77 }]);
});

testaAsync('limite e entrada inválida falham fechados antes de guardar dados extras', async () => {
  const r = runtimeOrganizacao(true);
  await r.api.pronto();
  await assert.rejects(() => r.api.alternarFavorito(0), (erro) => erro && erro.codigo === 'favorito-invalido');
  await assert.rejects(() => r.api.alternarFavorito('não-é-id'), (erro) => erro && erro.codigo === 'favorito-invalido');
  for (let numero = 1; numero <= 100; numero++) await r.api.alternarFavorito(numero);
  await assert.rejects(() => r.api.alternarFavorito(101), (erro) => erro && erro.codigo === 'limite-favoritos');
  assert.equal(r.registros.size, 100);
  assert.deepEqual([...r.registros.values()][0], { numero: 1 });
});

testaAsync('exporta backup mínimo, valida esquema estrito e restaura substituindo só favoritos locais', async () => {
  const banco = criarIndexedDbFalso();
  const r = runtimeOrganizacao(true, banco);
  await r.api.pronto();
  await r.api.alternarFavorito(19);
  await r.api.alternarFavorito(4);
  const backup = await r.api.exportarBackup();
  assert.deepEqual(backup, { formato: 'rebocl-favoritos-conversas', versao: 1, favoritos: [4, 19] });
  const serializado = JSON.stringify(backup);
  assert(!/titulo|mensagem|conteudo|token|github|http/i.test(serializado), 'backup não carrega conteúdo, token ou transporte');
  assert.deepEqual(r.api.limitesBackup(), { formato: 'rebocl-favoritos-conversas', versao: 1, bytes: 32768 });
  assert.throws(() => r.api.validarBackup({ formato: 'rebocl-favoritos-conversas', versao: 1, favoritos: [], extra: true }), (erro) => erro && erro.codigo === 'backup-favoritos-invalido');
  assert.throws(() => r.api.validarBackup({ formato: 'rebocl-favoritos-conversas', versao: '1', favoritos: [] }), (erro) => erro && erro.codigo === 'backup-favoritos-incompativel');
  assert.throws(() => r.api.validarBackup({ formato: 'rebocl-favoritos-conversas', versao: 1, favoritos: [4, 4] }), (erro) => erro && erro.codigo === 'backup-favoritos-invalido');
  assert.throws(() => r.api.validarBackup({ formato: 'rebocl-favoritos-conversas', versao: 1, favoritos: Array.from({ length: 101 }, (_, indice) => indice + 1) }), (erro) => erro && erro.codigo === 'backup-favoritos-invalido');
  assert.throws(() => r.api.validarBackup({ formato: 'rebocl-favoritos-conversas', versao: 1, favoritos: ['4'] }), (erro) => erro && erro.codigo === 'backup-favoritos-invalido');
  await assert.rejects(() => r.api.substituirBackup({ formato: 'rebocl-favoritos-conversas', versao: 1, favoritos: [0] }), (erro) => erro && erro.codigo === 'backup-favoritos-invalido');
  assert.equal(r.api.temFavorito(19), true, 'backup inválido não altera favoritos existentes');
  const normalizado = r.api.validarBackup({ formato: 'rebocl-favoritos-conversas', versao: 1, favoritos: [88, 6] });
  await r.api.substituirBackup(normalizado);
  assert.equal(r.api.temFavorito(4), false);
  assert.equal(r.api.temFavorito(6), true);
  assert.equal(r.api.temFavorito(88), true);
  assert.deepEqual([...banco.registros.values()], [{ numero: 6 }, { numero: 88 }]);
  const relida = runtimeOrganizacao(true, banco);
  await relida.api.pronto();
  assert.deepEqual(await relida.api.exportarBackup(), { formato: 'rebocl-favoritos-conversas', versao: 1, favoritos: [6, 88] });
});

testaAsync('sem IndexedDB não há fallback para rede ou armazenamento legado', async () => {
  const r = runtimeOrganizacao(false);
  await assert.rejects(() => r.api.pronto(), (erro) => erro && erro.codigo === 'armazenamento-indisponivel');
  assert.equal(r.api.estado(), 'falhou');
  assert.equal(r.api.temFavorito(1), false);
  assert.equal(r.eventos.some((evento) => evento.type === 'rebocl-organizacao-conversas-falhou'), true);
});

testa('quatro rotas carregam um ativo local e mantêm a organização visual idêntica', () => {
  const blocos = [];
  for (const rota of rotas) {
    const html = ler(rota);
    assert.equal((html.match(/chat-organizacao-local\.js/g) || []).length, 1, rota + ': ativo duplicado');
    assert.match(html, /<script src="chat-organizacao-local\.js"><\/script>/);
    const filtro = html.indexOf('<script src="chat-filtro-chips.js"></script>');
    const organizacao = html.indexOf('<script src="chat-organizacao-local.js"></script>');
    const colecoes = html.indexOf('<script src="chat-colecoes-local.js"></script>');
    const workspace = html.indexOf('<script src="chat-workspace.js"></script>');
    const inline = html.indexOf('<script>', workspace);
    assert(filtro >= 0 && organizacao > filtro && colecoes > organizacao && workspace > colecoes && inline > workspace, rota + ': ativo local precisa preceder o código da rota');
    assert.match(html, /id="btn-filtrar-favoritas"[^>]*aria-pressed="false"[^>]*disabled/);
    assert.match(html, /id="btn-apagar-favoritos" disabled/);
    assert.match(html, /id="btn-exportar-favoritos" disabled/);
    assert.match(html, /id="btn-importar-favoritos" disabled/);
    assert.match(html, /id="arq-importar-favoritos" accept="application\/json,\.json" class="oculto" disabled/);
    assert.match(html, /Backup manual dos favoritos locais/);
    assert.match(html, /function exportarBackupFavoritosLocais\(\)/);
    assert.match(html, /function importarBackupFavoritosLocais\(arquivo\)/);
    assert.match(html, /organizacao\.validarBackup\(JSON\.parse\(texto\)\)/);
    assert.match(html, /if \(tamanho > limites\.bytes\) throw erroBackupFavoritos\('backup-favoritos-grande'\);/);
    assert.match(html, /backupFavoritosEmAndamento = true;/);
    assert.match(html, /organizacao\.substituirBackup\(backup\)/);
    assert.match(html, /Isso substituirá todos os favoritos locais atuais deste navegador/);
    assert.match(html, /só o número da conversa — nunca título, mensagens ou token/i);
    assert.match(html, /function limparFavoritosLocais\(\)/);
    assert.match(html, /Apagar todos os favoritos salvos neste navegador\?/);
    assert.match(html, /Favorito guardado somente neste navegador\. Nada no GitHub foi alterado\./);
    assert.match(html, /Mostrando favoritas entre as conversas já carregadas neste navegador\./);
    assert.match(html, /function criarCartaoConversa\(i\) \{[\s\S]*document\.createElement\('article'\)/);
    assert.match(html, /className = 'conv-abrir'/);
    assert.match(html, /className = 'conv-favorita'/);
    assert.match(html, /evento\.stopPropagation\(\)/);
    assert.match(html, /filtroFavoritasAtivo && estadoOrganizacaoConversas\(\) === 'pronto'/);
    assert.match(html, /Nenhuma favorita entre as conversas carregadas/);
    const bloco = entre(html, '/* ---------- organização local de conversas ---------- */', '\nasync function novaConversa');
    blocos.push(bloco);
  }
  const hashes = blocos.map((bloco) => crypto.createHash('sha256').update(bloco).digest('hex'));
  assert.equal(new Set(hashes).size, 1, 'quatro rotas precisam manter a organização local idêntica');
});

testa('limpeza de cópias offline continua estreita e não apaga favoritos sem escolha explícita', () => {
  for (const rota of rotas) {
    const html = ler(rota);
    const limpeza = entre(html, 'async function limparCopiasOffline()', '\n\n/* ---------- sugestões');
    assert.doesNotMatch(limpeza, /limparFavoritos|rebocl-organizacao-conversas/);
    assert.match(html, /Isso não altera conversas no GitHub, token, cópias offline nem o Workspace/);
  }
});

testa('casca, workflow, corredor e continuidade observam o novo ativo', () => {
  const sw = ler('sw.js');
  const workflow = ler('.github/workflows/testes-rapidos.yml');
  const corredor = ler('tools/testes/roda-testes.js');
  const continuidade = ler('tools/testes/continuidade.js');
  assert.match(sw, /rebocl-chat-v91/);
  assert.match(sw, /'\.\/chat-organizacao-local\.js'/);
  assert.match(sw, /'\.\/chat-colecoes-local\.js'/);
  assert.match(workflow, /'chat-organizacao-local\.js'/);
  assert.match(corredor, /'organizacao-conversas-local\.js'/);
  assert(continuidade.includes('chat-organizacao-local\\.js'), 'porta não observa ativo novo');
});

testa('estilos mantêm botões nativos, alvo de toque e filtro responsivo', () => {
  const css = ler('chat-estilos.css');
  assert.match(css, /\.conv-conversa\{display:flex;align-items:stretch;padding:0;cursor:default;overflow:hidden\}/);
  assert.match(css, /\.conv-favorita,\.conv-colecao\{flex:0 0 44px;min-width:44px;min-height:44px/);
  assert.match(css, /#btn-filtrar-favoritas,#btn-filtrar-colecao\{flex:0 0 auto;min-height:40px/);
  assert.match(css, /\.backup-local\{margin-top:12px;padding:10px;border:1px solid var\(--borda\)/);
  assert.match(css, /\.backup-local-acoes\{display:flex;gap:8px;align-items:stretch;margin-top:9px\}/);
  assert.match(css, /@media \(max-width:600px\)\{\.busca-organizacao\{flex-wrap:wrap\}/);
});

(async function principal() {
  await Promise.all(pendentes);
  console.log(`${certos}/${certos + falhas} testes de organização local passaram`);
  process.exitCode = falhas ? 1 : 0;
})();
