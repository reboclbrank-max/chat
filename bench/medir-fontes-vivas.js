// Fase 2 (offline): aplica a regra de casamento da busca viva sobre o que a fase 1 coletou.
//
// O que mede: para cada item, a fonte escolhida cobre os fatos que o gabarito exige (mesmos
// padrões `contem` da régua) e — o que importa para decidir ligar ou não — se o artigo é
// SOBRE a pergunta. A pertinência é auditada à mão em bench/auditoria-fontes-vivas-105.json
// (rótulo + motivo por item); este script só conta os rótulos.
//
// NÃO mede se o modelo usa a fonte nem se a resposta melhora.
//
// Uso: node bench/medir-fontes-vivas.js [--salvar]
'use strict';
const fs = require('fs');
const path = require('path');
const { internos } = require('../roteador-ia');
const { satisfaz } = require('./equivalencias-rubrica');

const RAIZ = path.dirname(__dirname);
const CACHE = path.join(__dirname, 'cache-fontes-vivas.json');
const AUDITORIA = path.join(__dirname, 'auditoria-fontes-vivas-105.json');
const SAIDA = path.join(__dirname, 'fontes-vivas-105.json');

if (!fs.existsSync(CACHE)) {
  console.error('✘ Falta bench/cache-fontes-vivas.json — rode antes: node bench/coletar-fontes-vivas.js');
  process.exit(1);
}
const cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
const baseEstatica = JSON.parse(fs.readFileSync(path.join(RAIZ, 'fontes-publicas.json'), 'utf8'));
const auditoria = fs.existsSync(AUDITORIA) ? JSON.parse(fs.readFileSync(AUDITORIA, 'utf8')) : null;

const bancos = {
  original: 'banco-aberto-antes-100.json',
  holdout: 'banco-aberto-holdout-100.json',
  novo: 'banco-aberto-novo-102.json'
};

function cobertura(trecho, it) {
  const t = String(trecho || '');
  const total = (it.contem || []).length;
  return { ok: (it.contem || []).filter((p) => satisfaz(t, p)).length, total };
}

const linhas = [];
for (const [banco, arquivo] of Object.entries(bancos)) {
  for (const it of JSON.parse(fs.readFileSync(path.join(__dirname, arquivo), 'utf8'))) {
    const termos = internos.termosDeBusca(it.q);
    const achados = cache['busca:' + it.q];
    const estatico = cobertura(internos.contextoFontes(internos.selecionarFontesLocais(it.q, baseEstatica)), it);
    const recusado = { ok: 0, total: (it.contem || []).length };
    let decisao = null, vivo = null, titulo = null, temaNoTitulo = 0, coberturaTitulo = 0;
    if (achados) {
      decisao = internos.escolherFonte(achados, termos, internos.termosDoPedido(it.q));
      if (decisao) {
        titulo = decisao.escolhido.title;
        temaNoTitulo = decisao.temaNoTitulo;
        coberturaTitulo = decisao.coberturaTitulo;
        const art = cache['artigo:' + titulo];
        // redirect (ex. "Água pluvial" -> "Água da chuva") muda o título do artigo devolvido
        const art2 = art || Object.values(cache).find((v) => v && v.titulo === titulo) || null;
        if (art2) vivo = cobertura(internos.recortarFonte(art2.trecho || '', 1800), it);
      }
    }
    linhas.push({
      banco, id: it.id, q: it.q, termos,
      top5: (achados || []).map((a) => a.title),
      aceita: !!decisao, titulo, temaNoTitulo, coberturaTitulo,
      coberturaEstatica: estatico, coberturaViva: vivo || (decisao ? recusado : null)
    });
  }
}

const rotulo = (l) => {
  if (!l.aceita) return 'sem-fonte';
  if (!auditoria) return 'nao-auditado';
  const a = auditoria[l.q];
  if (!a) return 'nao-auditado';
  return a.pertinente ? 'pertinente' : 'ERRADO';
};

const somaFat = (ls, campo) => ls.reduce((s, l) => s + (l[campo] ? l[campo].ok : 0), 0);
const somaTot = (ls, campo) => ls.reduce((s, l) => s + (l[campo] ? l[campo].total : (l.coberturaEstatica.total || 0)), 0);
const completos = (ls, campo) => ls.filter((l) => l[campo] && l[campo].ok === l[campo].total).length;

// Quatro colunas, todas na MESMA lista de 36 itens e com os MESMOS padrões de fato:
//   sem fonte  — o padrão do produto hoje (nenhuma fonte entra no contexto)
//   opt-in     — base estática, que só entra com pedido `fontes:true`
//   vivo       — busca viva com portão (o que esta rodada liga no navegador)
//   opt-in+vivo— as duas juntas (não é o padrão; mede o que se ganharia)
for (const l of linhas) {
  l.uniao = { ok: Math.min(l.coberturaEstatica.total, l.coberturaEstatica.ok +
    (l.coberturaViva ? l.coberturaViva.ok : 0)), total: l.coberturaEstatica.total };
  l.semFonte = { ok: 0, total: l.coberturaEstatica.total };
}

console.log('Busca viva — medição de FONTE (não de resposta) · ' + linhas.length + ' itens\n');
console.log('coluna            itens com fonte   fatos cobertos   itens completos');
const colunas = [
  ['sem fonte (hoje)', null],
  ['opt-in (estática)', 'coberturaEstatica'],
  ['vivo (portão)', 'coberturaViva'],
  ['opt-in + vivo', 'uniao']
];
for (const [nome, campo] of colunas) {
  const comFonte = campo ? linhas.filter((l) => l[campo]).length : 0;
  const fatos = campo ? somaFat(linhas, campo) : 0;
  const tot = somaTot(linhas, 'coberturaEstatica');
  const cheios = campo ? completos(linhas, campo) : 0;
  console.log(nome.padEnd(18) + String(comFonte + '/' + linhas.length).padEnd(18) +
    (fatos + '/' + tot).padEnd(17) + cheios + '/' + linhas.length);
}

const aceitas = linhas.filter((l) => l.aceita);
if (auditoria) {
  const errados = aceitas.filter((l) => rotulo(l) === 'ERRADO');
  console.log('\nArtigos aceitos: ' + aceitas.length + ' · errados na auditoria manual: ' + errados.length +
    ' → precisão ' + (aceitas.length ? Math.round(1000 * (aceitas.length - errados.length) / aceitas.length) / 10 : 0) + '%');
  for (const l of errados) console.log('  ERRADO: ' + l.banco + ' #' + l.id + ' → ' + l.titulo);
}

console.log('\nArtigos escolhidos (auditoria à mão em bench/auditoria-fontes-vivas-105.json):');
for (const l of aceitas) {
  console.log('  ' + rotulo(l).padEnd(13) + l.banco + ' #' + String(l.id).padEnd(4) +
    (l.titulo || '').slice(0, 34).padEnd(36) + ' fatos ' +
    (l.coberturaViva ? l.coberturaViva.ok + '/' + l.coberturaViva.total : '—') +
    ' (estático ' + l.coberturaEstatica.ok + '/' + l.coberturaEstatica.total + ')');
}
const semFonte = linhas.filter((l) => !l.aceita);
console.log('\nRecusados pelo portão (' + semFonte.length + ') — nenhum trecho entra no contexto:');
for (const l of semFonte) console.log('  ' + l.banco + ' #' + l.id + ' · ' + l.q.slice(0, 56) + ' · top1: ' + (l.top5[0] || '—'));

// os itens que a régua reprovou por falta de fato na janela 105
const FALHAS_DE_FATO = [[ 'original', 16 ], [ 'original', 13 ], [ 'original', 14 ], [ 'original', 17 ], [ 'original', 22 ]];
console.log('\nItens reprovados por FATO na régua (janela 105) e o que a fonte passa a cobrir:');
for (const [banco, id] of FALHAS_DE_FATO) {
  const l = linhas.find((x) => x.banco === banco && x.id === id);
  if (!l) continue;
  console.log('  #' + id + ' ' + (l.aceita ? l.titulo : 'sem fonte aceita').padEnd(28) +
    ' vivo ' + (l.coberturaViva ? l.coberturaViva.ok : 0) + '/' + l.coberturaEstatica.total +
    ' · estático ' + l.coberturaEstatica.ok + '/' + l.coberturaEstatica.total);
}

if (process.argv.includes('--salvar')) {
  fs.writeFileSync(SAIDA, JSON.stringify({
    medido: new Date().toISOString(),
    itens: linhas.map((l) => ({ ...l, auditoria: rotulo(l) })),
    resumo: {
      aceitos: aceitas.length, total: total.length,
      errados: auditoria ? aceitas.filter((l) => rotulo(l) === 'ERRADO').length : null,
      fatosEstatico: somaFat(total, 'coberturaEstatica'), fatosVivo: somaFat(total, 'coberturaViva')
    }
  }, null, 1) + '\n');
  console.log('\nArquivo: ' + SAIDA);
}
