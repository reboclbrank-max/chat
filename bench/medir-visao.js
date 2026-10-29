// Régua de VISÃO — a única forma honesta de falar de visão: medir.
// Antes desta rodada não existia suporte a imagem (era promessa), e a sondagem mostrou que só uma
// rota gratuita aceita imagem (OVH Qwen3.5-397B). Este medidor usa o roteador como ele é usado.
const fs = require('fs');
const path = require('path');
const { acertou } = require('./pontuar.js');

const RAIZ = path.resolve(__dirname, '..');
const { Roteador } = require(path.join(RAIZ, 'roteador-ia.js'));
const banco = JSON.parse(fs.readFileSync(path.join(__dirname, 'banco-visao.json'), 'utf8'));

(async () => {
  const r = new Roteador();
  let ok = 0, semResp = 0, total429 = 0;
  const res = [];
  const t0 = Date.now();
  for (const item of banco) {
    const img = 'data:image/png;base64,' +
      fs.readFileSync(path.join(__dirname, 'visao', item.arq)).toString('base64');
    const o = await r.responder({ pergunta: item.q, imagem: img });
    const texto = String((o && o.texto) || '').trim();
    const passou = texto !== '' && acertou(texto, item.g, null, {});
    if (passou) ok++;
    if (!texto) semResp++;
    res.push({ id: item.id, arq: item.arq, gab: item.g, resp: texto.slice(0, 120), ok: passou,
               rota: o && o.rota, ms: o && o.ms });
    console.log((passou ? '✔' : '✘') + ' #' + String(item.id).padStart(2) +
      String((o && o.ms) || 0).padStart(8) + 'ms  ' + item.arq.padEnd(13) +
      'gab=' + item.g.join('|').padEnd(10) + ' resp=' + JSON.stringify(texto.slice(0, 40)));
  }
  const sum = {
    modo: 'visao', total: banco.length, acertos: ok,
    pct: Math.round((ok / banco.length) * 1000) / 10,
    semResposta: semResp, duracaoS: Math.round((Date.now() - t0) / 1000),
    latenciaMedianaMs: res.map((x) => x.ms || 0).sort((a, b) => a - b)[Math.floor(res.length / 2)]
  };
  console.log(JSON.stringify(sum));
  fs.writeFileSync(path.join(__dirname, 'resultado-visao.json'), JSON.stringify({ sum, res }, null, 1));
  console.log('salvo em ' + path.join(__dirname, 'resultado-visao.json'));
})();
