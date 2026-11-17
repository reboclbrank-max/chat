// TRIAGEM dos mutantes vivos — separa o que nunca executa do que executa e sobreviveu.
//
// Regra do instrutor: vivo sem teste que o mate é EQUIVALENTE até prova em contrário;
// mutante que nunca executa não entra no denominador.
//
// Validação da medição (importante): um mutante MORTO prova que a linha dele EXECUTA.
// Então uso os mortos como gabarito: se a cobertura diz que a linha de um mutante morto
// não executou, a atribuição daquele módulo está quebrada (é o caso de módulo rodado por
// vm.runInContext, que o V8 não atribui a URL) e a cobertura é descartada para ele.
//
// Uso: node tools/testes/triagem-vivos.js
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const placar = JSON.parse(fs.readFileSync(path.join(DIR, 'mutador-placar.json'), 'utf8'));
const cov = JSON.parse(fs.readFileSync(path.join(DIR, 'cobertura-linhas.json'), 'utf8'));

// gabarito por módulo: linhas de mutantes mortos = linhas que comprovadamente executam
const mortosPorModulo = {};
for (const r of placar.resultados) {
  if (!r.detalhes) continue;
  mortosPorModulo[r.arquivo] = r.detalhes.filter(d => d.morto).map(d => d.linha);
}

const confiavel = {};
for (const [mod, mortos] of Object.entries(mortosPorModulo)) {
  if (!mortos.length) continue;
  const exec = new Set((cov.modulos[mod] && cov.modulos[mod].linhasExecutadas) || []);
  const falhas = mortos.filter(l => !exec.has(l));
  confiavel[mod] = { mortos: mortos.length, falhas: falhas.length, ok: falhas.length === 0 };
}

const vivos = [];
for (const r of placar.resultados) {
  if (!r.detalhes) continue;
  const info = cov.modulos[r.arquivo] || { linhasExecutadas: [], percentual: 0, linhas: 0 };
  const exec = new Set(info.linhasExecutadas || []);
  const conf = confiavel[r.arquivo];
  const medicaoBoa = conf ? conf.ok : (info.linhasExecutadas || []).length === 0 || true;
  for (const d of r.detalhes) {
    if (d.morto || d.invalido) continue;
    let classificacao, prova;
    if (medicaoBoa && (info.linhasExecutadas || []).length > 0) {
      const executada = exec.has(d.linha);
      classificacao = executada ? 'A-CLASSIFICAR' : 'NAO-EXECUTA';
      prova = executada
        ? 'linha ' + d.linha + ' está nas faixas executadas pelos testes que cobrem o módulo'
        : 'linha ' + d.linha + ' nunca entra em faixa executada de nenhum dos ' + r.testes.length +
          ' teste(s) que cobrem ' + r.arquivo + ' (cobertura V8); módulo só executa ' +
          (info.linhasExecutadas || []).length + '/' + info.linhas + ' linhas';
    } else {
      classificacao = 'A-CLASSIFICAR';
      prova = 'cobertura não atribuível a este módulo (executado por vm/Function dentro do teste); ' +
        'medir por leitura do sítio, não por faixa';
    }
    vivos.push({
      modulo: r.arquivo, linha: d.linha, tipo: d.tipo, descricao: d.descricao,
      linhaExecutada: (info.linhasExecutadas || []).includes(d.linha),
      testesQueCobrem: r.testes, classificacao, prova,
    });
  }
}

const conta = {};
for (const v of vivos) conta[v.classificacao] = (conta[v.classificacao] || 0) + 1;
fs.writeFileSync(path.join(DIR, 'triagem-vivos.json'), JSON.stringify({
  geradoEm: new Date().toISOString(), total: vivos.length, conta,
  validacaoCobertura: confiavel, vivos,
}, null, 2) + '\n');
console.log('vivos: ' + vivos.length + ' · ' + JSON.stringify(conta));
console.log('validação da cobertura pelo gabarito dos mortos:');
for (const [m, c] of Object.entries(confiavel).filter(([, c]) => !c.ok)) {
  console.log('  ✘ ' + m + ' — ' + c.falhas + '/' + c.mortos + ' linhas mortas fora da cobertura (não atribuível)');
}
