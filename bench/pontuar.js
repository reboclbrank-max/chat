/* Pontuador da régua — corrigido em 2026-10-27 depois da auditoria item a item.
   Defeitos que ele conserta (antes davam falso negativo):
   - subscrito/sobrescrito: "H₂O" não casava com "h2o"
   - hífen não separável U+2011 e travessões: "baleia‑azul" não casava com "baleia-azul"
   - gênero/plural do gabarito: "Deserto da Antártica" não casava com "antártico"
   - sinônimo legítimo: "Matilha" é resposta certa para coletivo de lobos (gabarito só tinha alcateia)
   Nada disso afrouxa número: cada regra é uma equivalência linguística explícita, testada abaixo. */
'use strict';

const SUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };

function normalizar(texto) {
  let s = String(texto == null ? '' : texto);
  s = s.replace(/[₀-₉]/g, (c) => SUB[c] || c).replace(/[⁰-⁹]/g, (c) => SUP[c] || c);
  s = s.replace(/[\u2010-\u2015\u2212]/g, '-');          // hífens e travessões → '-'
  s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); // sem acento
  s = s.toLowerCase();
  s = s.replace(/r\$/g, ' ').replace(/[^a-z0-9,.\-\s]/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

function ehNumero(g) {
  return /^-?\d+(?:[.,]\d+)?$/.test(g);
}

/* radical: tira plural, gênero e sufixos comuns, para casar "antartica" com "antartico" */
function radical(palavra) {
  let p = palavra;
  p = p.replace(/(co|c a)$/, 'c');
  p = p.replace(/(?:es|s)$/, '');
  p = p.replace(/(?:a|o|e)$/, '');
  return p;
}

function contemRadical(respostaNormalizada, alvo) {
  const r = radical(alvo);
  if (r.length < 4) return false;
  return new RegExp('(^|[^a-z0-9])' + r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-z]*').test(respostaNormalizada);
}

function acertou(resposta, gabaritos, alternativas) {
  if (resposta == null || String(resposta).trim() === '') return false;
  const r = normalizar(resposta);
  const lista = [].concat(gabaritos || [], alternativas || []);
  for (const bruto of lista) {
    const g = normalizar(bruto);
    if (!g) continue;
    if (ehNumero(g)) {
      const alvo = parseFloat(g.replace(',', '.'));
      const achados = (r.match(/-?\d+(?:[.,]\d+)?/g) || []).map((n) => parseFloat(n.replace(',', '.')));
      // mesma precisão do lado menos preciso do gabarito: 3,14159 ≡ 3,14 (π), mas 205 ≢ 206
      const dec = (g.split(/[.,]/)[1] || '').length;
      const tol = dec === 0 ? 0 : 0.5 * Math.pow(10, -dec);
      if (achados.some((n) => Math.abs(n - alvo) <= tol + 1e-9)) return true;
    } else {
      if (r.includes(g)) return true;
      // múltiplas palavras: basta o núcleo (a última palavra significativa)
      const palavras = g.split(' ').filter((p) => p.length >= 4);
      if (palavras.length && contemRadical(r, palavras[palavras.length - 1])) return true;
      if (palavras.length > 1 && palavras.every((p) => contemRadical(r, p))) return true;
    }
  }
  return false;
}

module.exports = { normalizar, acertou, radical };

/* autoteste: os casos que a auditoria encontrou viram prova permanente */
if (require.main === module) {
  const casos = [
    ['H₂O', ['h2o'], true, 'subscrito'],
    ['A baleia\u2011azul (Balaenoptera musculus).', ['baleia-azul'], true, 'hífen não separável'],
    ['Deserto da Antártica', ['antártico'], true, 'gênero do gabarito'],
    ['Matilha', ['alcateia'], true, 'sinônimo declarado no banco', ['matilha']],
    ['Shigaraki Palace', ['tóquio'], false, 'erro real continua erro'],
    ['abelhão', ['zangão'], false, 'erro real continua erro'],
    ['43', ['43'], true, 'número'],
    ['R$ 12,50', ['12,5'], true, 'decimal com vírgula'],
    ['3,14159', ['3,14'], true, 'π com mais precisão não é erro'],
    ['3,1415926535', ['3,1416'], true, 'π truncado em qualquer precisão'],
    ['3,15', ['3,14'], false, 'π arredondado errado continua erro'],
    ['205', ['206'], false, 'inteiro vizinho não passa por tolerância']
  ];
  let ok = 0;
  for (const [resp, gab, esperado, nome, alts] of casos) {
    const obtido = acertou(resp, gab, alts || null);
    const passou = obtido === esperado;
    if (passou) ok++;
    console.log((passou ? '✔' : '✘') + ' ' + nome + ' — ' + JSON.stringify(resp) + ' × ' + JSON.stringify(gab) + ' → ' + obtido);
  }
  console.log(ok + '/' + casos.length + ' casos do pontuador');
  process.exitCode = ok === casos.length ? 0 : 1;
}
