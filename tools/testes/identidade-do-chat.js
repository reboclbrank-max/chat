// IDENTIDADE DO PRODUTO (rodada 137, 31/10/2026).
//
// Medido: "qual é o seu nome?" não era respondida pelo produto — ia PARA O MODELO e voltava com
// nome de outra empresa. Um assistente que erra o próprio nome não serve, e a regra da casa é
// "sem identidade emprestada". Este teste cobra três coisas:
//   1. o produto se identifica como "Assistente Rebocl", sem rede e sem modelo;
//   2. o nome é o MESMO no título, no manifest, no README e na casca (um nome, uma verdade);
//   3. pergunta sobre OUTRO nome (cliente, arquivo, autor) continua indo para o modelo.
'use strict';
const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
const R = require(path.join(RAIZ, 'razao-local.js'));
let certos = 0;
const falhas = [];
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (e) { falhas.push(nome); console.error('✘ ' + nome + ' — ' + e.message); }
}
function ler(rel) { return fs.readFileSync(path.join(RAIZ, rel), 'utf8'); }
const NOME = 'Assistente Rebocl';

testa('o produto diz o próprio nome sem modelo', () => {
  for (const q of ['Qual é o seu nome?', 'Como você se chama?', 'Quem é você?', 'Qual o seu nome completo?']) {
    const r = R.resolver(q);
    if (!r || r.texto.indexOf(NOME) === -1) throw new Error('não se identificou em: ' + q + ' → ' + (r && r.texto));
    if (r.ferramenta !== 'identidade') throw new Error('caminho inesperado em ' + q + ': ' + r.ferramenta);
  }
});

testa('não aceita identidade emprestada', () => {
  for (const q of ['Você é o ChatGPT?', 'Você é o Gemini?', 'Você foi feito pela OpenAI?']) {
    const r = R.resolver(q);
    if (!r) throw new Error('ficou calado em: ' + q);
    if (!/^Não\b/.test(r.texto)) throw new Error('respondeu "' + r.texto + '" em: ' + q);
    if (r.texto.indexOf(NOME) === -1) throw new Error('negou sem dizer quem é: ' + q);
  }
});

testa('pergunta sobre outro nome continua com o modelo (o produto não chuta)', () => {
  for (const q of ['Qual é o nome do criador do Linux?',
    'Qual é o seu nome no cadastro do cliente?',
    'Qual é o seu nome no arquivo enviado?',
    'Qual o nome da empresa que fez o relatório?']) {
    const r = R.identidade(q);
    if (r) throw new Error('respondeu "' + r.texto + '" em: ' + q);
  }
});

testa('o nome é o mesmo no título, no manifest, no README e na casca', () => {
  const index = ler('index.html'), manifest = JSON.parse(ler('manifest.json')), readme = ler('README.md');
  if (index.indexOf('<title>Chat — ' + NOME + '</title>') === -1) throw new Error('título da página não traz o nome');
  if (manifest.name !== 'Chat — ' + NOME) throw new Error('manifest.name = ' + manifest.name);
  if (readme.indexOf(NOME) === -1) throw new Error('README não traz o nome');
  const sw = ler('sw.js');
  if (!/rebocl-chat-v\d+/.test(sw)) throw new Error('casca sem versão');
});

(async () => {
  const { Roteador } = require(path.join(RAIZ, 'roteador-ia.js'));
  const r = new Roteador({ amostrasAberto: 1 });
  r._chamar = async () => ({ erro: 'rede', ms: 1 });
  r._consenso = async () => null;
  let ok = false, detalhe = 'sem texto';
  try {
    const o = await r.responder({ pergunta: 'Qual é o seu nome?', semConsenso: true, semEsperaBoa: true, semRevisao: true });
    ok = !!(o && o.texto && o.texto.indexOf('Assistente Rebocl') !== -1);
    detalhe = o && o.texto;
  } catch (e) { detalhe = e.message; }
  if (ok) { certos++; console.log('✔ o nome chega ao texto final com o modelo quebrado'); }
  else { falhas.push('fio'); console.error('✘ o nome não chegou ao texto final — veio ' + JSON.stringify(detalhe)); }

  console.log('');
  if (falhas.length) { console.error('✘ ' + falhas.length + ' de ' + (certos + falhas.length) + ' verificações de identidade FALHARAM'); process.exit(1); }
  console.log('✔ ' + certos + '/' + (certos + falhas.length) + ' verificações de identidade passaram');
})();
