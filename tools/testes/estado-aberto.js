// A forma não é verificação factual; fallback incompleto deve ser visível sem alterar texto bruto.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Roteador, internos } = require('../../roteador-ia.js');
const anotar = internos.anotarRespostaAberta;

(async () => {
  const r = new Roteador();
  r._textoLongo = async () => null;
  const original = 'A biblioteca organiza livros. Ela mantém um catálogo.';
  r._gerar = async () => ({ texto: original, rota: 'falsa', confianca: 'alta' });
  const pedido = { pergunta: 'Explique em dois parágrafos como funciona uma biblioteca.', tipo: 'aberto', semFerramenta: true };
  const saida = await r.responder(pedido);
  assert.strictEqual(saida.texto, original, 'o aviso não pode adulterar o texto bruto');
  assert.strictEqual(saida.confianca, 'nao_verificada');
  assert.strictEqual(saida.verificacaoFactual, 'nao_verificada');
  assert.strictEqual(saida.incompleto, true);
  assert.match(saida.avisoFormato, /1 de 2 parágrafos/);
  const cache = await r.responder(pedido);
  assert.strictEqual(cache.cache, true);
  assert.match(cache.avisoFormato, /1 de 2 parágrafos/, 'cache preserva o aviso');

  const completo = anotar({ texto: 'Primeiro bloco.\n\nSegundo bloco.', confianca: 'alta' }, { paragrafos: 2 });
  assert.strictEqual(completo.avisoFormato, undefined);
  assert.strictEqual(completo.confianca, 'nao_verificada');
  const lista = anotar({ texto: '1. Primeiro.\n2. Segundo.' }, { itens: 3 });
  assert.match(lista.avisoFormato, /2 de 3 itens/);
  assert.strictEqual(anotar({ texto: 'Uma única resposta.' }, {}).avisoFormato, undefined);

  // As quatro rotas da interface devem mostrar o aviso e não chamar texto aberto de factual verificado.
  for (const arquivo of ['index.html', 'direto.html', 'ligar.html', 'limpar.html']) {
    const html = fs.readFileSync(path.join(__dirname, '../..', arquivo), 'utf8');
    assert(html.includes('r.avisoFormato') && html.includes('rr.avisoFormato'), arquivo + ': exibir aviso');
    assert(html.includes('conteúdo não verificado'), arquivo + ': exibir estado factual');
  }
  console.log('✔ texto aberto: aviso de formato, cache e estado não verificado nas quatro rotas');
})().catch((e) => { console.error(e); process.exitCode = 1; });
