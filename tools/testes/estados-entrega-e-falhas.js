// Regressão offline: estados de entrega e agregação sanitizada por mensagem.
// Não abre rede, caixa, GitHub, navegador externo ou usa credencial.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  classeFalhaMensagem, criaEstadoFalhasMensagem, registraFalhaMensagem,
  registraSucessoMensagem, resumoFalhaMensagem, LIMITE_FALHAS_REPETIDAS
} = require('../falhas-mensagem');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0;
let falhas = 0;
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function fonte(nome) { return fs.readFileSync(path.join(raiz, nome), 'utf8'); }
function trechoEstados(src) {
  const inicio = src.indexOf('const ESTADOS_ENTREGA = Object.freeze({');
  const fim = src.indexOf('\nfunction pensando(mostrar, texto) {', inicio);
  assert(inicio >= 0 && fim > inicio, 'máquina de entrega não encontrada');
  return src.slice(inicio, fim);
}
function runtimeEstados(src) {
  const chamadas = [];
  const ctx = {
    Object, Number, Date,
    pensando: (mostrar, texto) => chamadas.push({ tipo: 'pensando', mostrar, texto }),
    bolha: (_tipo, texto, _iso, rotulo) => chamadas.push({ tipo: 'bolha', texto, rotulo }),
    rolarFim: () => chamadas.push({ tipo: 'rolar' })
  };
  vm.createContext(ctx);
  vm.runInContext(trechoEstados(src) + '\nglobalThis.texto = textoEstadoEntrega; globalThis.erro = estadoEntregaParaErro; globalThis.atualizar = atualizarEstadoEntrega; globalThis.encerrar = encerrarEstadoEntrega;', ctx);
  return { ctx, chamadas };
}

for (const rota of rotas) {
  const src = fonte(rota);
  testa(rota + ' declara todos os estados fechados de entrega', () => {
    const r = runtimeEstados(src);
    assert.match(r.ctx.texto('criando-conversa'), /^Criando a conversa/);
    assert.match(r.ctx.texto('mensagem-criada'), /^Mensagem criada/);
    assert.match(r.ctx.texto('contingencia-local'), /Falha do turno confirmada/);
    assert.match(r.ctx.texto('resultado-incerto'), /Atualize antes de tentar novamente/);
    assert.match(r.ctx.texto('consulta-interrompida'), /não será reenviada automaticamente/);
    assert.equal(r.ctx.erro({ status: 401 }), 'envio-recusado');
    assert.equal(r.ctx.erro({ status: 500 }), 'resultado-incerto');
    assert.equal(r.ctx.erro({}), 'resultado-incerto');
  });
  testa(rota + ' mantém espera ativa e encerra resultado incerto sem dado externo', () => {
    const r = runtimeEstados(src);
    r.ctx.atualizar('contingencia-local');
    assert.deepEqual(r.chamadas[0], { tipo: 'pensando', mostrar: true, texto: r.ctx.texto('contingencia-local') });
    r.ctx.encerrar('resultado-incerto', 'teste', 'detalhe seguro');
    assert.deepEqual(r.chamadas[1], { tipo: 'pensando', mostrar: false, texto: r.ctx.texto('resultado-incerto') });
    assert.match(r.chamadas[2].texto, /resultado-incerto|Não consegui confirmar o envio/);
    assert.match(r.chamadas[2].texto, /detalhe seguro/);
  });
  testa(rota + ' não inicia contingência só por demora e tem ARIA no estado transitório', () => {
    assert.match(src, /function iniciarContingenciaConfirmada\(numero\)/);
    assert.match(src, /if \(await trabalhadorFalhouRapido\(contexto\)\) \{ iniciarContingenciaConfirmada\(conversa\); return; \}/);
    assert.doesNotMatch(src, /tentativas === 10[\s\S]{0,500}emergenciaFeita = true/);
    assert.match(src, /d\.setAttribute\('role', 'status'\)/);
    assert.match(src, /d\.setAttribute\('aria-live', 'polite'\)/);
  });
  testa(rota + ' deixa POST falho em estado explícito, sem alertar/repetir', () => {
    assert.match(src, /encerrarEstadoEntrega\(estadoEntregaParaErro\(e\), '⚠️ entrega', mensagemErroSeguro\(e\)\)/);
    assert.doesNotMatch(src, /alert\('Não consegui enviar:/);
    assert.match(src, /resposta local apareceu neste navegador, mas não consegui confirmar o registro/);
  });
  testa(rota + ' protege criação por cartão e reenvio contra duplo toque', () => {
    assert.match(src, /let paginaLista = 1,[\s\S]{0,220}criandoNovaConversa = false/);
    const inicioNova = src.indexOf("async function novaConversa(sugestao = '') {");
    const fimNova = src.indexOf('\n/* ---------- conversa ---------- */', inicioNova);
    const nova = src.slice(inicioNova, fimNova);
    assert.match(nova, /if \(criandoNovaConversa\) return/);
    assert.match(nova, /aria-busy/);
    assert.match(nova, /não vou repetir este envio automaticamente/);
    assert.doesNotMatch(nova, /alert\('Não consegui criar/);
    const inicioReenvio = src.indexOf('async function reenviarUltima() {');
    const fimReenvio = src.indexOf('\nfunction faixaOffline', inicioReenvio);
    const reenvio = src.slice(inicioReenvio, fimReenvio);
    assert.match(reenvio, /if \(botao && botao\.disabled\) return/);
    assert.match(reenvio, /if \(botao\) botao\.disabled = true/);
    assert.match(reenvio, /iniciarPolling\(\{ inicio, evento: 'issue_comment' \}\)/);
    assert.match(reenvio, /finally \{ if \(botao\) botao\.disabled = false; \}/);
  });
}

for (const rota of ['index.html', 'limpar.html']) {
  const src = fonte(rota);
  testa(rota + ' trava o botão antes de criar conversa por POST', () => {
    const inicio = src.indexOf("atualizarEstadoEntrega('criando-conversa')");
    const post = src.indexOf("method: 'POST', body: JSON.stringify({ title:", inicio);
    const trava = src.lastIndexOf("$('btn-enviar').disabled = true;", inicio);
    assert(inicio >= 0 && post > inicio && trava >= 0 && trava < post, 'botão não foi travado antes da criação');
    const fim = src.indexOf('\n// Quando o workflow privado', inicio);
    assert(fim > post, 'fim do fluxo de criação não encontrado');
    assert.match(src.slice(inicio, fim), /estadoEntregaParaErro\(e\)/);
  });
}

testa('classes por mensagem são fechadas e não derivam da mensagem bruta', () => {
  assert.equal(classeFalhaMensagem({ status: 401 }), 'acesso');
  assert.equal(classeFalhaMensagem({ status: 429 }), 'limite');
  assert.equal(classeFalhaMensagem({ status: 503 }), 'servico');
  assert.equal(classeFalhaMensagem(new Error('DADO-ARBITRARIO-NAO-EXIBIR-123')), 'processamento');
});
testa('uma falha isolada só é observada e não carrega dado privado', () => {
  const estado = criaEstadoFalhasMensagem();
  const dadoArbitrario = 'DADO-ARBITRARIO-NAO-EXIBIR-987';
  const r = registraFalhaMensagem(estado, new Error(dadoArbitrario), 'anexo', 1000);
  const texto = resumoFalhaMensagem(r);
  assert.equal(r.acao, 'observar');
  assert.equal(r.repetida, false);
  assert.equal(r.porClasse.anexo, 1);
  assert(!texto.includes(dadoArbitrario));
});
testa('padrão repetido fica agregado, sem recuperação ou reprocessamento automático', () => {
  const estado = criaEstadoFalhasMensagem();
  let r;
  for (let i = 0; i < LIMITE_FALHAS_REPETIDAS; i++) r = registraFalhaMensagem(estado, { status: 503 }, null, 1000 + i);
  assert.equal(r.repetida, true);
  assert.equal(r.acao, 'observar');
  assert.match(resumoFalhaMensagem(r), /padrão repetido/);
  assert.equal(r.porClasse.servico, LIMITE_FALHAS_REPETIDAS);
});
testa('sucesso posterior zera apenas a sequência, mantendo histórico agregado da janela', () => {
  const estado = criaEstadoFalhasMensagem();
  registraFalhaMensagem(estado, null, 'leitura', 1000);
  registraFalhaMensagem(estado, null, 'leitura', 1001);
  const r = registraSucessoMensagem(estado, 1002);
  assert.equal(r.consecutivas, 0);
  assert.equal(r.repetida, false);
  assert.equal(r.totalNaJanela, 2);
});
testa('email-chat só relata a classe fechada no catch individual', () => {
  const src = fonte('tools/email-chat.js');
  const inicio = src.indexOf('      } catch (e) {', src.indexOf('async function processOnce()'));
  const fim = src.indexOf('\n      }\n    }\n  } finally', inicio);
  assert(inicio >= 0 && fim > inicio, 'catch individual não encontrado');
  const bloco = src.slice(inicio, fim);
  assert.match(bloco, /anotarFalhaMensagem\(e\)/);
  assert.doesNotMatch(bloco, /String\(e && e\.message/);
  assert.doesNotMatch(bloco, /uid ' \+ uid/);
});

console.log(`${certos}/${certos + falhas} estados de entrega e falhas sanitizadas passaram`);
process.exitCode = falhas ? 1 : 0;
