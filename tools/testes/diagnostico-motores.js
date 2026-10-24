// Contrato do diagnóstico local de motores — 2026-10-24.
// Garante três coisas que não podem regredir:
//  1. o resumo é sanitizado (sem conteúdo de conversa, URL, token ou credencial);
//  2. nada sai para a rede e o histórico é limitado;
//  3. o laço de motores da página deixa de engolir falha em silêncio.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '../..');
let certos = 0;
let falhas = 0;
function ok(nome, fn) {
  try {
    fn();
    certos++;
    console.log('✔ ' + nome);
  } catch (e) {
    falhas++;
    console.error('✘ ' + nome + ' — ' + e.message);
  }
}
function ler(nome) {
  return fs.readFileSync(path.join(raiz, nome), 'utf8');
}

// Storage falso: conta escritas e permite simular cota estourada/bloqueio.
function storageFalso(opcoes = {}) {
  const dados = new Map();
  return {
    dados,
    setItem(chave, valor) {
      if (opcoes.recusar) throw new Error('QuotaExceededError');
      dados.set(chave, String(valor));
    },
    getItem(chave) {
      return dados.has(chave) ? dados.get(chave) : null;
    },
    removeItem(chave) {
      dados.delete(chave);
    }
  };
}

function carrega(modulo) {
  const contexto = { window: {}, localStorage: modulo.storage, console };
  contexto.window = contexto;
  vm.createContext(contexto);
  vm.runInContext(ler('chat-diagnostico.js'), contexto, { filename: 'chat-diagnostico.js' });
  return contexto.DiagnosticoMotores;
}

function novoModulo(opcoes) {
  const storage = storageFalso(opcoes);
  return { storage, api: carrega({ storage }) };
}

ok('módulo publica o contrato esperado', () => {
  const { api } = novoModulo();
  for (const nome of ['registrarFalhaMotor', 'registrarSucessoMotor', 'resumoDiagnostico', 'motivoDeFalha', 'limparDiagnostico', 'nomeSeguro']) {
    assert.equal(typeof api[nome], 'function', 'faltou ' + nome);
  }
});

ok('classifica motivo fechado a partir de status e erro', () => {
  const { api } = novoModulo();
  assert.equal(api.motivoDeFalha(null, 429), 'limite');
  assert.equal(api.motivoDeFalha(null, 401), 'limite');
  assert.equal(api.motivoDeFalha(null, 403), 'limite');
  assert.equal(api.motivoDeFalha(null, 503), 'servidor');
  assert.equal(api.motivoDeFalha(null, 404), 'formato');
  assert.equal(api.motivoDeFalha({ name: 'TimeoutError', message: 'x' }), 'tempo');
  assert.equal(api.motivoDeFalha({ name: 'AbortError', message: 'x' }), 'tempo');
  assert.equal(api.motivoDeFalha({ name: 'TypeError', message: 'Failed to fetch' }), 'rede');
  assert.equal(api.motivoDeFalha({ name: 'Error', message: 'nada conhecido' }), 'outro');
});

ok('nome do motor é sanitizado e limitado', () => {
  const { api } = novoModulo();
  assert.equal(api.nomeSeguro('GLM-5.3 · reserva'), 'GLM-5.3 · reserva');
  const comLixo = api.nomeSeguro('Motor <script>https://x.test/?token=abc</script>');
  assert(!/[<>/?=&]/.test(comLixo), 'sanitização deixou caractere perigoso: ' + comLixo);
  assert(api.nomeSeguro('a'.repeat(300)).length <= 40, 'nome não foi truncado');
  assert.equal(api.nomeSeguro(''), 'motor sem nome');
});

ok('registra falha sem gravar conteúdo de conversa', () => {
  const { storage, api } = novoModulo();
  api.registrarFalhaMotor({ nome: 'GLM-5.3' }, { name: 'TypeError', message: 'Failed to fetch https://api.exemplo/v1?k=SEGREDO' });
  const bruto = storage.getItem(api.CHAVE);
  assert(bruto.indexOf('SEGREDO') === -1, 'mensagem de erro vazou para o storage');
  assert(bruto.indexOf('api.exemplo') === -1, 'URL vazou para o storage');
  const lista = JSON.parse(bruto);
  assert.equal(lista.length, 1);
  assert.deepEqual(Object.keys(lista[0]).sort(), ['hora', 'm', 'motivo']);
  assert.equal(lista[0].motivo, 'rede');
});

ok('histórico é limitado e mantém as tentativas mais recentes', () => {
  const { storage, api } = novoModulo();
  for (let i = 0; i < 120; i++) api.registrarFalhaMotor({ nome: 'motor' + i }, 'outro');
  const lista = JSON.parse(storage.getItem(api.CHAVE));
  assert.equal(lista.length, api.LIMITE, 'limite não aplicado: ' + lista.length);
  assert.equal(lista[lista.length - 1].m, 'motor119', 'não preservou o mais recente');
});

ok('resumo conta motivos e cita motores, sem conteúdo', () => {
  const { api } = novoModulo();
  api.registrarFalhaMotor({ nome: 'GLM-5.3' }, null, 429);
  api.registrarFalhaMotor({ nome: 'Kimi-K3' }, null, 503);
  api.registrarFalhaMotor({ nome: 'GLM-5.3' }, { name: 'TypeError', message: 'Failed to fetch' });
  api.registrarSucessoMotor({ nome: 'Pollinations' });
  const resumo = api.resumoDiagnostico();
  assert(/3 tentativa\(s\) sem resposta/.test(resumo), 'contagem errada: ' + resumo);
  assert(/limite/.test(resumo) && /provedor respondeu com erro/.test(resumo) && /rede indisponível/.test(resumo), 'motivos ausentes: ' + resumo);
  assert(/GLM-5.3/.test(resumo), 'motor não citado: ' + resumo);
  assert(resumo.length < 400, 'resumo longo demais');
});

ok('sem falhas, o resumo é vazio (nada é inventado)', () => {
  const { api } = novoModulo();
  assert.equal(api.resumoDiagnostico(), '');
  api.registrarSucessoMotor({ nome: 'GLM-5.3' });
  assert.equal(api.resumoDiagnostico(), '');
});

ok('storage bloqueado ou cheio não quebra o Chat', () => {
  const { api } = novoModulo({ recusar: true });
  assert.doesNotThrow(() => api.registrarFalhaMotor({ nome: 'GLM-5.3' }, 'outro'));
  assert.doesNotThrow(() => api.resumoDiagnostico());
  const vazio = novoModulo();
  vazio.storage.setItem(vazio.api.CHAVE, '{{{lixo');
  assert.equal(vazio.api.resumoDiagnostico(), '', 'lixo no storage deveria ser ignorado');
});

ok('módulo não abre rede nem usa API de terceiro', () => {
  const fonte = ler('chat-diagnostico.js');
  assert.doesNotMatch(fonte, /\bfetch\s*\(/, 'diagnóstico não pode fazer fetch');
  assert.doesNotMatch(fonte, /XMLHttpRequest|sendBeacon|WebSocket|EventSource/, 'diagnóstico não pode abrir canal');
  assert.doesNotMatch(fonte, /https?:\/\//, 'diagnóstico não pode citar URL');
  assert.doesNotMatch(fonte, /document\.|innerHTML/, 'diagnóstico não escreve no DOM');
});

ok('as quatro páginas carregam o módulo antes do código da rota', () => {
  for (const rota of ['index.html', 'direto.html', 'ligar.html', 'limpar.html']) {
    const html = ler(rota);
    assert.equal((html.match(/chat-diagnostico\.js/g) || []).length, 1, rota + ': ativo duplicado');
    assert.match(html, /<script src="chat-diagnostico\.js"><\/script>/, rota + ': ativo ausente');
    const modulo = html.indexOf('<script src="chat-diagnostico.js"></script>');
    const inline = html.indexOf('<script>', modulo);
    assert(modulo >= 0 && inline > modulo, rota + ': módulo precisa preceder o código da rota');
  }
});

ok('o laço de motores registra falha em vez de silenciar', () => {
  for (const rota of ['index.html', 'direto.html', 'ligar.html', 'limpar.html']) {
    const html = ler(rota);
    assert(/diagnosticoFalha\(m, null, r\.status\)/.test(html), rota + ': provedor com erro não é registrado');
    assert(/catch \(e\) \{ diagnosticoFalha\(m, e, 0\); \}/.test(html), rota + ': exceção do laço continua silenciosa');
    assert(/function diagnosticoResumo\(\)/.test(html), rota + ': falta o resumo para a pessoa');
    assert(/🩺 ' \+ resumoMotores/.test(html), rota + ': falha total não mostra o resumo');
  }
});

ok('o diagnóstico é limitado ao aparelho e citado na casca offline', () => {
  const sw = ler('sw.js');
  assert(/'\.\/chat-diagnostico\.js'/.test(sw), 'precache não inclui o módulo');
  assert(/rebocl-chat-v\d+/.test(sw), 'casca sem versão');
});

console.log('\n' + (falhas ? '✘ ' : '✔ ') + certos + '/' + (certos + falhas) + ' testes do diagnóstico de motores passaram');
process.exitCode = falhas ? 1 : 0;
