// Testes offline com relógio falso: segunda tentativa deve continuar mesmo após o prazo inicial.
'use strict';
const assert = require('assert');
const { Roteador } = require('../../roteador-ia.js');

function paragrafoValido(i) {
  return ('A explicação do tema descreve suas etapas com cuidado e apresenta exemplos relevantes. '.repeat(7)) +
    'Este é o bloco número ' + (i + 1) + '.';
}

(async () => {
  const relogioReal = Date.now;
  const timerReal = global.setTimeout;
  let tempo = 1000000;
  Date.now = () => tempo;
  global.setTimeout = (fn, ms) => { tempo += Math.max(0, ms || 0); queueMicrotask(fn); return 1; };
  try {
    const catalogo = [{ id: 'falso', nome: 'falso', base: 'https://host-falso.invalid/v1',
      modelo: 'teste', classe: 'forte', peso: 90, latPar: 100 }];
    const r = new Roteador({ catalogo });
    r._esperarVez = async () => {};
    let chamadasPar2 = 0, chamadasPlano = 0;
    r._chamar = async (rota, pedido, timeout, opc) => {
      if (/elementos concretos que um texto completo/.test(pedido)) {
        chamadasPlano++;
        assert.strictEqual(opc.longo, true, 'o plano precisa preservar várias linhas');
        assert(/um por linha/.test(opc.sistema), 'plano tem sistema compatível com lista');
        return { texto: 'luz solar\nclorofila\nglicose', ms: 1 };
      }
      if (/parágrafo 2 de 2/.test(pedido)) {
        chamadasPar2++;
        if (chamadasPar2 === 1) {
          tempo += 86000; // vence o orçamento original de 85s
          return { erro: 'servidor', ms: 86000 };
        }
      }
      return { texto: paragrafoValido(/parágrafo 2 de 2/.test(pedido) ? 1 : 0), ms: 5 };
    };
    const resultado = await r._textoLongo('Explique em dois parágrafos o que é fotossíntese.',
      { paragrafos: 2, minPalavras: 70 });
    assert(resultado, 'prazo da primeira tentativa não deve impedir a segunda');
    assert.strictEqual(resultado.texto.split(/\n\n/).length, 2);
    assert.strictEqual(chamadasPar2, 2, 'somente o bloco ausente deve ser refeito');
    assert.strictEqual(chamadasPlano, 1);
    assert(tempo >= 1000000 + 86000 + 8000, 'espera o cooldown simulado da rota');
    console.log('✔ prazo da segunda tentativa: reaproveita bloco bom e espera cooldown');

    const semPlano = new Roteador({ catalogo });
    semPlano._esperarVez = async () => {};
    let plano = 0;
    semPlano._chamar = async (rota, pedido) => {
      if (/elementos concretos que um texto completo/.test(pedido)) { plano++; return { erro: 'timeout' }; }
      return { texto: paragrafoValido(0), ms: 5 };
    };
    const sem = await semPlano._textoLongo('Explique em dois parágrafos.', { paragrafos: 2, minPalavras: 70 });
    assert(sem && sem.texto, 'falha no plano não pode impedir um texto utilizável');
    assert.strictEqual(plano, 1);
    console.log('✔ falha de planejamento não derruba o texto');
  } finally {
    Date.now = relogioReal;
    global.setTimeout = timerReal;
  }
})().catch((erro) => { console.error(erro); process.exitCode = 1; });
