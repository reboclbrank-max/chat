// sonda de latência: quanto tempo cada rota leva para gerar UM parágrafo de ~85 palavras
const { Roteador, CATALOGO } = require('/home/user/chat-v2/roteador-ia.js');
const r = new Roteador();
const SYS = 'Responda em português do Brasil, sem preâmbulo.';
const pedido = 'Tema do texto: Explique o que é fotossíntese.\n\nEscreva SOMENTE o parágrafo 1 de 2, ' +
  'em português do Brasil, com 53 a 93 palavras, em 3 a 5 frases completas. Comece definindo o ' +
  'assunto e dê um exemplo concreto.';
(async () => {
  for (const id of ['gigante2', 'kilolight', 'lagunas', 'ovhq397']) {
    const rota = CATALOGO.find((x) => x.id === id);
    if (!rota) { console.log(id, 'não está no catálogo'); continue; }
    const t0 = Date.now();
    const res = await r._chamar(rota, pedido, 60000, { maxTokens: 700, longo: true, sistema: SYS });
    const palavras = res.texto ? res.texto.split(/\s+/).filter(Boolean).length : 0;
    console.log(id.padEnd(11), String(Date.now() - t0).padStart(6) + 'ms',
      'erro=' + (res.erro || '-'), 'palavras=' + palavras);
  }
})();
