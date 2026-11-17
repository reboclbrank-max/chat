// PLACAR — uma tabela, uma fórmula. Nada de dois números de instrumentos diferentes.
//
// POR QUE EXISTE (17/11/2026): eu vinha publicando "37% (66/179)" e "67,9% (55/81)". Os dois
// vinham de instrumentos com universos distintos: o mutador gerava 179 mutantes válidos; a
// triagem falava de 189 gerados e 81 que executam. Comparar os dois era comparar réguas
// diferentes — e o instrutor pegou. Aqui cada mutante é UMA linha, com um status, e os dois
// números saem da MESMA contagem.
//
// STATUS (as quatro categorias, sem ambiguidade):
//   morta        um teste que EXECUTA o módulo falhou por causa da mutação
//   viva         nenhum teste que executa o módulo percebeu a mutação
//   nao_executa  o módulo não tem nenhum leitor que execute código (só leitura estática)
//   invalida     a mutação não aplica, não compila ou não carrega
//
// ORIGEM:
//   mutador   gerada pelo mutador (seed 42, --max 6)
//   buraco     sítio sabido da triagem: nenhum contrato prende. Aberto conta VIVO.
//              Fechado (com contrato e vermelho visto) conta MORTO.
//
// Uso:
//   node tools/testes/placar.js --construir     # refaz placar.json a partir das duas corridas
//   node tools/testes/placar.js --recalcular    # só lê placar.json e recalcula (é o que o instrutor roda)
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const PLACAR = path.join(DIR, 'placar.json');
const TODOS = path.join(DIR, 'mutador-placar-todos.json');
const COMP = path.join(DIR, 'mutador-placar-comportamental.json');
const TRIAGEM = path.join(DIR, 'triagem-vivos.json');

const STATUS = ['morta', 'viva', 'nao_executa', 'invalida'];

// Quais buracos já foram fechados, com o contrato que os prende. Fechar exige prova vista
// vermelha: o nome aqui sem contrato correspondente seria mentira.
const FECHADOS = {
  'tools/reserva-turno.js:109': 'buracos-ciclo4.js — ordem das tentativas e backoff por literal',
  'tools/termometro-barreira.js:107': 'buracos-ciclo4.js — janela recente inclusiva (5 conta)',
};

function chave(r) { return r.arquivo + '|' + r.linha + '|' + r.tipo + '|' + r.descricao; }

function construi() {
  const todos = JSON.parse(fs.readFileSync(TODOS, 'utf8'));
  const comp = JSON.parse(fs.readFileSync(COMP, 'utf8'));
  const triagem = JSON.parse(fs.readFileSync(TRIAGEM, 'utf8'));

  // veredito comportamental por sítio
  const veredito = new Map();
  for (const alvo of comp.resultados) {
    for (const d of (alvo.detalhes || [])) {
      veredito.set(alvo.arquivo + '|' + d.linha + '|' + d.tipo + '|' + d.descricao,
        d.invalido ? 'invalida' : (d.morto ? 'morta' : 'viva'));
    }
  }
  // módulos que têm algum leitor que executa (para separar "viva" de "não executável")
  const temLeitorComportamental = new Set(comp.resultados.filter(a => (a.detalhes || []).length > 0).map(a => a.arquivo));

  const linhas = [];
  let n = 0;
  for (const alvo of todos.resultados) {
    for (const d of (alvo.detalhes || [])) {
      n++;
      const k = chave({ arquivo: alvo.arquivo, ...d });
      let status, motivo;
      if (d.invalido) { status = 'invalida'; motivo = 'mutação não aplica ou não compila'; }
      else if (veredito.has(k)) { status = veredito.get(k); motivo = 'veredito da corrida só-comportamental'; }
      else if (!temLeitorComportamental.has(alvo.arquivo)) {
        status = 'nao_executa'; motivo = 'o módulo não tem nenhum leitor que executa código (só estático)';
      } else { status = 'nao_executa'; motivo = 'sítio não reapareceu na corrida só-comportamental'; }
      linhas.push({
        id: 'M' + String(n).padStart(3, '0'),
        arquivo: alvo.arquivo, linha: d.linha, tipo: d.tipo, descricao: d.descricao,
        status, origem: 'mutador', motivo,
      });
    }
  }

  for (const b of triagem.vivos.filter(v => v.classificacao === 'BURACO')) {
    const k = b.modulo + ':' + b.linha;
    const fechado = FECHADOS[k];
    linhas.push({
      id: 'B' + String(linhas.length - n + 1).padStart(3, '0'),
      arquivo: b.modulo, linha: b.linha, tipo: b.tipo, descricao: b.prova || b.descricao,
      status: fechado ? 'morta' : 'viva',
      origem: 'buraco',
      motivo: fechado ? 'fechado: ' + fechado : 'buraco aberto: nenhum contrato prende este sítio',
    });
  }

  const placar = {
    geradoEm: new Date().toISOString(),
    seed: todos.seed, maxPorModulo: todos.maxPorModulo,
    fontes: ['mutador-placar-todos.json', 'mutador-placar-comportamental.json', 'triagem-vivos.json'],
    regra: 'aberto conta vivo; kill só conta se um teste que executa o módulo falhou por comportamento',
    linhas,
  };
  fs.writeFileSync(PLACAR, JSON.stringify(placar, null, 1) + '\n');
  console.log('placar.json: ' + linhas.length + ' linhas (' + n + ' do mutador + ' +
    (linhas.length - n) + ' buracos da triagem)');
  return placar;
}

function recalcula(placar, opcoes) {
  const imprimir = !opcoes || opcoes.imprimir !== false;
  const conta = Object.fromEntries(STATUS.map(s => [s, 0]));
  const porOrigem = {};
  const porTipo = {};
  for (const l of placar.linhas) {
    conta[l.status]++;
    porOrigem[l.origem] = porOrigem[l.origem] || Object.fromEntries(STATUS.map(s => [s, 0]));
    porOrigem[l.origem][l.status]++;
    if (l.status === 'morta' || l.status === 'viva') {
      porTipo[l.tipo] = porTipo[l.tipo] || [0, 0];
      porTipo[l.tipo][l.status === 'morta' ? 0 : 1]++;
    }
  }
  const total = placar.linhas.length;
  const validas = total - conta.invalida;                        // universo que existe
  const executaveis = conta.morta + conta.viva;                  // universo com veredito

  const diz = (t) => { if (imprimir) console.log(t); };
  diz('── PLACAR ── ' + total + ' linhas · seed ' + placar.seed + ' · max ' + placar.maxPorModulo);
  diz('   morta        ' + String(conta.morta).padStart(4));
  diz('   viva         ' + String(conta.viva).padStart(4) + '   (inclui ' +
    (porOrigem.buraco ? (porOrigem.buraco.viva || 0) : 0) + ' buraco(s) aberto(s))');
  diz('   nao_executa  ' + String(conta.nao_executa).padStart(4));
  diz('   invalida     ' + String(conta.invalida).padStart(4));
  diz('   soma         ' + String(conta.morta + conta.viva + conta.nao_executa + conta.invalida).padStart(4) + '  ✔');
  diz('');
  diz('   ingênuo = mortas / mutantes válidos          = ' + conta.morta + '/' + validas +
    ' = ' + (100 * conta.morta / validas).toFixed(1) + '%');
  diz('   estrito = mortas / (mortas + vivas)          = ' + conta.morta + '/' + executaveis +
    ' = ' + (100 * conta.morta / executaveis).toFixed(1) + '%');
  diz('');
  diz('   por tipo (mortas/veredictos):');
  for (const [t, v] of Object.entries(porTipo).sort((a, b) => (b[1][0] / (b[1][0] + b[1][1])) - (a[1][0] / (a[1][0] + a[1][1])))) {
    diz('     ' + t.padEnd(22) + v[0] + '/' + (v[0] + v[1]) + ' = ' +
      Math.round(100 * v[0] / (v[0] + v[1])) + '%');
  }
  return {
    total, conta, validas, executaveis, porTipo,
    ingenuo: conta.morta / validas,
    estrito: conta.morta / executaveis,
    somaConfere: conta.morta + conta.viva + conta.nao_executa + conta.invalida === total,
  };
}

if (require.main === module) {
  const arg = process.argv.slice(2);
  if (arg.includes('--construir')) { construi(); }
  if (arg.includes('--construir') || arg.includes('--recalcular')) {
    recalcula(JSON.parse(fs.readFileSync(PLACAR, 'utf8')));
  } else {
    console.log('uso: --construir | --recalcular');
    process.exitCode = 1;
  }
}

module.exports = { construi, recalcula };
