// Contrato da Política de Segurança de Conteúdo — 2026-10-24.
// Antes, a CSP das páginas cobria só `base-uri`, `object-src` e `form-action`: o resto
// (inclusive de onde scripts e requisições podiam vir) ficava aberto por omissão.
// Este contrato fecha isso e impede a volta do "aberto por omissão":
//  1. as diretivas mínimas existem em todas as páginas com CSP;
//  2. nenhum host citado na página fica fora de `connect-src` (senão a função quebra em silêncio);
//  3. `script-src` não ganha `unsafe-eval` nem curinga;
//  4. as quatro rotas compartilham exatamente a mesma política.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '../..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
const comCsp = rotas.concat(['console.html']);
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
function politica(html) {
  const m = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html);
  assert(m, 'página sem meta Content-Security-Policy');
  return m[1];
}
function diretivas(pol) {
  const mapa = {};
  for (const parte of pol.split(';')) {
    const t = parte.trim();
    if (!t) continue;
    const [nome, ...valores] = t.split(/\s+/);
    mapa[nome.toLowerCase()] = valores;
  }
  return mapa;
}
function hostsDaPagina(html) {
  // Ignora a própria meta de CSP: ela lista os hosts autorizados, não usos.
  const semCsp = html.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]+">/, '');
  return new Set([...semCsp.matchAll(/https:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)].map((m) => m[1].toLowerCase()));
}

ok('todas as páginas com CSP declaram a política', () => {
  for (const rota of comCsp) assert.match(ler(rota), /<meta http-equiv="Content-Security-Policy" content="[^"]+">/, rota + ': CSP ausente');
});

ok('as diretivas mínimas estão presentes e fechadas por padrão', () => {
  for (const rota of comCsp) {
    const d = diretivas(politica(ler(rota)));
    assert(d['default-src'], rota + ': sem default-src');
    assert(d['default-src'].includes("'self'"), rota + ': default-src não é restrito');
    assert.equal(d['object-src'] && d['object-src'][0], "'none'", rota + ': object-src precisa ser none');
    assert.equal(d['base-uri'] && d['base-uri'][0], "'none'", rota + ': base-uri precisa ser none');
    assert(d['form-action'], rota + ': sem form-action');
    assert(d['script-src'], rota + ': sem script-src');
    assert(d['style-src'], rota + ': sem style-src');
    assert(d['connect-src'], rota + ': sem connect-src');
    assert(d['img-src'], rota + ': sem img-src');
    assert(d['worker-src'], rota + ': sem worker-src');
    assert(d['frame-src'], rota + ': sem frame-src');
    assert.equal(d['frame-src'][0], "'none'", rota + ': frame-src precisa ser none');
  }
});

ok('script-src não aceita eval nem curinga', () => {
  for (const rota of comCsp) {
    const script = diretivas(politica(ler(rota)))['script-src'];
    assert(!script.includes("'unsafe-eval'"), rota + ': unsafe-eval liberado sem necessidade');
    assert(!script.includes('*'), rota + ': curinga no script-src');
    assert(!script.some((v) => /^https?:/.test(v)), rota + ': script externo liberado');
    assert(script.includes("'self'"), rota + ': script-src precisa permitir a própria casca');
  }
});

ok('todo host citado na página está autorizado em connect-src', () => {
  for (const rota of comCsp) {
    const html = ler(rota);
    const d = diretivas(politica(html));
    const autorizados = new Set(d['connect-src'].map((v) => v.replace(/^https:\/\//, '')).filter((v) => v.includes('.')));
    const usados = hostsDaPagina(html);
    const fora = [...usados].filter((h) => !autorizados.has(h));
    assert.equal(fora.length, 0, rota + ': host fora do connect-src → ' + fora.slice(0, 5).join(', '));
  }
});

ok('connect-src não autoriza host que a página não usa', () => {
  for (const rota of comCsp) {
    const html = ler(rota);
    const d = diretivas(politica(html));
    const autorizados = d['connect-src'].map((v) => v.replace(/^https:\/\//, '')).filter((v) => v.includes('.'));
    const usados = hostsDaPagina(html);
    const sobrando = autorizados.filter((h) => !usados.has(h));
    assert.equal(sobrando.length, 0, rota + ': connect-src com host não usado → ' + sobrando.slice(0, 5).join(', '));
  }
});

ok('connect-src sempre inclui a própria origem', () => {
  for (const rota of comCsp) {
    assert(diretivas(politica(ler(rota)))['connect-src'].includes("'self'"), rota + ': falta self no connect-src');
  }
});

ok('as quatro rotas compartilham exatamente a mesma política', () => {
  const base = politica(ler('index.html'));
  for (const rota of rotas) assert.equal(politica(ler(rota)), base, rota + ': política divergente da index.html');
});

ok('a política não cai para curinga geral', () => {
  for (const rota of comCsp) {
    const d = diretivas(politica(ler(rota)));
    for (const nome of Object.keys(d)) {
      if (nome === 'connect-src' || nome === 'img-src' || nome === 'media-src') continue;
      assert(!d[nome].includes('*'), rota + ': curinga em ' + nome);
      assert(!d[nome].includes('http:') && !d[nome].includes('https:'), rota + ': esquema amplo em ' + nome);
    }
  }
});

ok('política não abre exceção por domínio inteiro sem necessidade', () => {
  for (const rota of comCsp) {
    const d = diretivas(politica(ler(rota)));
    const curingas = d['connect-src'].filter((v) => v.includes('*'));
    assert.equal(curingas.length, 0, rota + ': connect-src com curinga → ' + curingas.slice(0, 3).join(', '));
  }
});

ok('frame-ancestors fica fora da meta e o motivo está documentado', () => {
  // O navegador ignora `frame-ancestors` entregue por <meta> e ainda registra um erro de
  // segurança no console em toda carga. Por isso a diretiva saiu da meta: quem protege
  // contra enquadramento é cabeçalho HTTP, que o Pages não envia para a casca estática.
  const continuidade = ler('CONTINUIDADE.md');
  for (const rota of comCsp) {
    assert(!/frame-ancestors/.test(politica(ler(rota))), rota + ': frame-ancestors voltou para a meta e gera erro no console');
  }
  assert(/frame-ancestors/.test(continuidade), 'a continuidade precisa registrar o motivo da ausência');
  assert(/ignorad/i.test(continuidade), 'a continuidade precisa dizer que o navegador ignora a diretiva em meta');
});

console.log('\n' + (falhas ? '✘ ' : '✔ ') + certos + '/' + (certos + falhas) + ' testes de CSP passaram');
process.exitCode = falhas ? 1 : 0;
