// Contrato offline da interface: a API não revela mensagem externa nem repete
// escrita ambígua; importação é limitada/honesta; rotas e PWA mantêm paridade.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0;
let falhas = 0;
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
async function testaAsync(nome, fn) {
  try { await fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function fonte(nome) { return fs.readFileSync(path.join(raiz, nome), 'utf8'); }
function trecho(texto, inicio, fim) {
  const a = texto.indexOf(inicio);
  const b = texto.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho não encontrado: ' + inicio);
  return texto.slice(a, b);
}
function blocoCritico(html) {
  return {
    api: trecho(html, 'function erroDaApi(status) {', '\nconst TAMANHO_PAGINA_COMENTARIOS'),
    markdown: trecho(html, 'function escapar(t) {', '\nconst DONO_GITHUB'),
    importar: trecho(html, 'const VERSAO_EXPORTACAO = 1;', '\nfunction montarBusca()')
  };
}
function contextoBase(respostas) {
  let chamadas = 0;
  const ctx = {
    API: 'https://api.exemplo.test', token: 'token-inerte',
    Promise, Object, Number, String, Array, JSON,
    setTimeout: (fn) => { fn(); return 0; },
    fetch: async () => {
      chamadas++;
      const proxima = respostas.shift();
      if (proxima instanceof Error) throw proxima;
      return proxima;
    }
  };
  vm.createContext(ctx);
  return { ctx, chamadas: () => chamadas };
}
function runtimeApi(html, respostas) {
  const r = contextoBase(respostas);
  vm.runInContext(blocoCritico(html).api + '\nfunction atualizarAvisoAtualizacaoPwa() {}\nglobalThis.apiTeste = api; globalThis.erroTeste = mensagemErroSeguro;', r.ctx);
  return r;
}
function runtimeImportacao(html) {
  const r = contextoBase([]);
  vm.runInContext(blocoCritico(html).api + '\n' + blocoCritico(html).importar + '\nglobalThis.prepararTeste = prepararImportacao;', r.ctx);
  return r;
}
function resposta(status, corpo) {
  return { ok: status >= 200 && status < 300, status, text: async () => corpo || '' };
}

async function principal() {
  const fontes = Object.fromEntries(rotas.map((rota) => [rota, fonte(rota)]));
  const referencias = Object.values(fontes).map(blocoCritico);
  for (const chave of ['api', 'markdown', 'importar']) {
    testa('as quatro rotas mantêm paridade crítica: ' + chave, () => {
      assert.equal(new Set(referencias.map((b) => b[chave])).size, 1);
    });
  }
  const pwa = fonte('chat-pwa.js');
  testa('as quatro rotas usam o mesmo cliente PWA externo', () => {
    for (const html of Object.values(fontes)) {
      assert.match(html, /<script src="chat-pwa\.js"><\/script>/);
      assert.doesNotMatch(html, /function marcarAtualizacaoPwa\(registro\)/);
    }
    assert.match(pwa, /navigator\.serviceWorker\.register\('sw\.js', \{ updateViaCache: 'none' \}\)/);
  });

  for (const rota of rotas) {
    const html = fontes[rota];
    testa(rota + ' não reflete e.message na interface', () => {
      assert.doesNotMatch(html, /\be\.message\b/);
      assert.doesNotMatch(html, /\+ e(?:,| \+)/);
      assert.match(html, /mensagemErroSeguro\(e\)/);
    });
    testa(rota + ' informa importação parcial de modo honesto', () => {
      assert.match(html, /primeira mensagem sua/i);
      assert.match(html, /nada foi reenviado automaticamente/i);
      assert.match(html, /LIMITE_IMPORTACAO_CONVERSAS = 25/);
      assert.match(html, /VERSAO_EXPORTACAO/);
    });
    await testaAsync(rota + ' repete somente leitura transitória', async () => {
      const r = runtimeApi(html, [new Error('rede temporária'), resposta(200, '{"ok":true}')]);
      const valor = await r.ctx.apiTeste('/leitura');
      assert.equal(valor.ok, true);
      assert.equal(r.chamadas(), 2);
    });
    await testaAsync(rota + ' não repete POST de resultado ambíguo', async () => {
      const r = runtimeApi(html, [new Error('servidor pode ter criado')]);
      await assert.rejects(() => r.ctx.apiTeste('/escrita', { method: 'POST', body: '{}' }));
      assert.equal(r.chamadas(), 1);
    });
    await testaAsync(rota + ' oculta corpo arbitrário de erro HTTP', async () => {
      const r = runtimeApi(html, [resposta(403, '{"message":"segredo ou URL que não deve voltar"}')]);
      let erro;
      try { await r.ctx.apiTeste('/leitura'); } catch (capturado) { erro = capturado; }
      assert(erro, 'erro esperado');
      const humano = r.ctx.erroTeste(erro);
      assert.match(humano, /recusado|limitado/);
      assert.doesNotMatch(humano, /segredo|URL/i);
    });
    testa(rota + ' valida importação antes de qualquer escrita', () => {
      const r = runtimeImportacao(html);
      const entrada = {
        versao: 1,
        conversas: [{ titulo: 'Minha conversa', mensagens: [
          { de: 'assistente', texto: 'resposta antiga' },
          { de: 'voce', texto: 'primeira pergunta' },
          { de: 'voce', texto: 'pergunta posterior' }
        ] }]
      };
      const pronta = r.ctx.prepararTeste(entrada, 200);
      assert.equal(pronta.length, 1);
      assert.equal(pronta[0].corpo, 'primeira pergunta');
      assert.equal(pronta[0].titulo, 'Minha conversa');
      assert.throws(() => r.ctx.prepararTeste({ conversas: Array.from({ length: 26 }, () => entrada.conversas[0]) }, 100), /local:importacao-limite/);
      assert.throws(() => r.ctx.prepararTeste(entrada, 2 * 1024 * 1024 + 1), /local:arquivo-grande/);
      assert.throws(() => r.ctx.prepararTeste({ versao: 2, conversas: entrada.conversas }, 100), /local:versao-importacao/);
    });
  }

  const sw = fonte('sw.js');
  testa('service worker inclui as quatro rotas e versão nova de cache', () => {
    assert.match(sw, /rebocl-chat-v53/);
    assert.match(sw, /'\.\/chat-pwa\.js'/);
    assert.match(sw, /'\.\/chat-comandos-locais\.js'/);
  assert.match(sw, /'\.\/chat-filtro-chips\.js'/);
    for (const rota of rotas) assert.match(sw, new RegExp("'\\./" + rota.replace('.', '\\.') + "'"));
    assert.match(sw, /url\.search/);
    assert.match(sw, /cache: 'no-store'/);
  });

  const consoleHtml = fonte('console.html');
  testa('console também categoriza erro sem refletir API', () => {
    assert.doesNotMatch(consoleHtml, /\be\.message\b/);
    assert.match(consoleHtml, /function mensagemErroSeguro\(erro\)/);
    assert.match(consoleHtml, /mensagemErroSeguro\(e\)/);
  });

  console.log(`${certos}/${certos + falhas} testes de segurança e fluxo da interface passaram`);
  process.exitCode = falhas ? 1 : 0;
}
principal().catch((erro) => {
  console.error(erro && erro.stack ? erro.stack : erro);
  process.exitCode = 1;
});
