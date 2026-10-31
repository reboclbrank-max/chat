// AUTO-DIAGNÓSTICO (31/10/2026) — o teste da ferramenta que dita o ritmo.
//
// O auto-diagnóstico só vale se for honesto: as provas têm de ser executáveis, a classificação
// tem de cobrir todas as provas, e ele NÃO pode escolher o melhor placar escondido nem inventar
// nota. Este teste roda o programa de verdade (offline, sem modelo) e confere essas garantias.
'use strict';
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..', '..');
let certos = 0;
const falhas = [];
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (e) { falhas.push(nome); console.error('✘ ' + nome + ' — ' + e.message); }
}
function roda(args) {
  return execFileSync(process.execPath, [path.join(RAIZ, 'tools', 'auto-melhoria.js')].concat(args || []),
    { cwd: RAIZ, encoding: 'utf8', timeout: 120000 });
}

testa('as provas do chat existem e têm resposta de referência', () => {
  const banco = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tools', 'provas-do-chat.json'), 'utf8'));
  assert(Array.isArray(banco.provas) && banco.provas.length >= 40, 'poucas provas: ' + banco.provas.length);
  for (const p of banco.provas) {
    assert(p.id && p.q && p.ok && p.ok.length, 'prova incompleta: ' + JSON.stringify(p.id));
  }
});

testa('o relatório classifica TODAS as provas (nada fica sem conta)', () => {
  const rel = JSON.parse(roda(['--json']));
  assert.equal(rel.provas.porCodigo + rel.provas.dependemDoModelo, rel.provas.total);
  assert.equal(rel.provas.total, JSON.parse(fs.readFileSync(path.join(RAIZ, 'tools', 'provas-do-chat.json'), 'utf8')).provas.length);
});

testa('nenhuma prova é respondida ERRADA pelo caminho exato', () => {
  // Resposta exata errada é o pior defeito possível: se aparecer, o teste falha aqui.
  const rel = JSON.parse(roda(['--json']));
  assert.deepEqual(rel.provas.erradas, [], 'erradas: ' + rel.provas.erradas.join(', '));
});

testa('a fila de conserto é ranqueada e diz o custo de cada item', () => {
  const rel = JSON.parse(roda(['--json']));
  assert(Array.isArray(rel.lacunas));
  for (const l of rel.lacunas) {
    assert(l.tipo && l.provas > 0 && l.custo && l.acao, 'lacuna incompleta: ' + JSON.stringify(l));
  }
  // item medido e rejeitado vai para o FIM de propósito (não é trabalho pendente), então a
  // ordem por ganho só vale entre os que ainda são trabalho.
  // a ordem é por ganho ÷ custo (campo `valor`, publicada no relatório), não por ganho bruto:
  // 1 prova barata vem antes de 3 caras.
  const ordenaveis = rel.lacunas.filter((l) => l.estado !== 'rejeitado-por-medicao');
  for (const l of ordenaveis) assert(typeof l.valor === 'number', 'lacuna sem valor: ' + l.tipo);
  if (ordenaveis.length) assert(ordenaveis[0].valor >= ordenaveis[ordenaveis.length - 1].valor,
    'fila fora de ordem: ' + ordenaveis.map((l) => l.tipo + '=' + l.valor).join(', '));
});

testa('texto aberto: os concorrentes aparecem (não se escolhe o melhor placar escondido)', () => {
  const rel = JSON.parse(roda(['--json']));
  if (!rel.aberto) return;                        // repositório sem medição: nada a esconder
  assert(Array.isArray(rel.aberto.concorrentes) && rel.aberto.concorrentes.length >= 1);
  const escolhido = rel.aberto.concorrentes.find((c) => c.arquivo === rel.aberto.arquivo);
  assert(escolhido, 'o arquivo usado não está na lista de concorrentes');
});

testa('o histórico cresce e guarda tendência', () => {
  const hist = JSON.parse(fs.readFileSync(path.join(RAIZ, 'docs', 'auto-melhoria.json'), 'utf8'));
  assert(Array.isArray(hist.rodadas) && hist.rodadas.length >= 1);
  const u = hist.rodadas[hist.rodadas.length - 1];
  assert(typeof u.porCodigo === 'number' && typeof u.provas === 'number');
  assert(u.porCodigo <= u.provas);
});

testa('armadilhas: o código não responde o que não sabe', () => {
  const rel = JSON.parse(roda(['--json', '--fio=1']));
  assert(rel.armadilhas && rel.armadilhas.total >= 17, 'armadilhas insuficientes: ' + (rel.armadilhas && rel.armadilhas.total));
  const ruins = rel.armadilhas.itens.filter((i) => !i.ok);
  assert.deepEqual(ruins.map((i) => i.id + '→' + i.resposta), [],
    'chute do caminho exato: ' + ruins.map((i) => i.id + '→' + i.resposta).join(', '));
});

testa('prova de fio: as respostas exatas chegam ao texto final SEM modelo', () => {
  // Roda com a chamada de modelo quebrada de propósito: se o fio estiver partido, não sobra texto.
  const rel = JSON.parse(roda(['--json', '--fio=500']));
  assert.equal(rel.fio.ok, rel.fio.total, 'fio partido: ' + rel.fio.itens.filter((i) => !i.ok).map((i) => i.id).join(', '));
  assert.equal(rel.fio.total, rel.provas.porCodigo, 'a prova de fio tem de cobrir todas as provas resolvidas por código');
});

testa('cobertura: todo solucionador tem prova e armadilha', () => {
  const rel = JSON.parse(roda(['--json', '--fio=1']));
  assert.deepEqual(rel.cobertura.semProva, [], 'sem prova: ' + rel.cobertura.semProva.join(', '));
  assert.deepEqual(rel.cobertura.semArmadilha, [], 'sem armadilha: ' + rel.cobertura.semArmadilha.join(', '));
});

testa('trava de regressão não dispara no estado atual', () => {
  const saida = roda(['--exigir-sem-regressao', '--fio=500']);
  assert(/sem regressão/.test(saida), 'a trava disparou: ' + saida.slice(-400));
});

testa('o gabarito e as armadilhas têm hash registrado no histórico', () => {
  const hist = JSON.parse(fs.readFileSync(path.join(RAIZ, 'docs', 'auto-melhoria.json'), 'utf8'));
  const u = hist.rodadas[hist.rodadas.length - 1];
  assert(u.provasHash, 'histórico sem hash do gabarito');
  assert(u.armadilhasHash, 'histórico sem hash das armadilhas');
});

testa('capacidade: cada eixo tem antes, hoje, alvo do dobro e estado', () => {
  const rel = JSON.parse(roda(['--json', '--fio=1']));
  assert(rel.capacidade && Array.isArray(rel.capacidade.eixos) && rel.capacidade.eixos.length >= 8);
  for (const e of rel.capacidade.eixos) {
    assert(e.id && e.rotulo && typeof e.antes === 'number' && typeof e.hoje === 'number'
      && typeof e.dobro === 'number' && e.estado, 'eixo incompleto: ' + JSON.stringify(e));
    assert(e.dobro > 0, 'eixo sem alvo: ' + e.id);
  }
  // a régua é fixa: se a régua subisse com o placar, "dobrar" nunca teria prova
  assert.equal(rel.capacidade.regua, 'rodada 135');
  assert(rel.capacidade.dobrados >= 1, 'nenhum eixo dobrado — o relatório está mentindo ou o motor parou');
});

testa('fila: item medido e rejeitado não fica no topo da fila', () => {
  const rel = JSON.parse(roda(['--json', '--fio=1']));
  const rejeitados = rel.lacunas.filter((l) => l.estado === 'rejeitado-por-medicao');
  if (!rejeitados.length) return;                  // repositório sem a medição: nada a cobrar
  for (const l of rejeitados) {
    assert(l.medicao && l.medicao.arquivo, 'rejeitado sem arquivo de medição: ' + l.tipo);
    assert(typeof l.medicao.cobertos === 'number' && l.medicao.total > 0, 'rejeitado sem número');
  }
  assert(rel.lacunas[0].estado !== 'rejeitado-por-medicao', 'fila começa num item já rejeitado');
});

testa('guarda (--vigiar): aprova o estado atual com uma linha de veredito', () => {
  const saida = roda(['--vigiar', '--fio=500']);
  assert(/GUARDA: nada quebrado/.test(saida), 'o guarda reprovou o estado atual: ' + saida.slice(-500));
});

testa('guarda (--vigiar): REPROVA quando alguém quebra um solucionador', () => {
  // Contraprova: um guarda que nunca dispara não é guarda. Cópia mínima do repositório com o
  // solucionador de probabilidade desligado — o vigia TEM de sair com código 1.
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'guarda-'));
  for (const rel of ['razao-local.js', 'roteador-ia.js', 'tools/auto-melhoria.js',
    'tools/provas-do-chat.json', 'tools/armadilhas-do-chat.json', 'docs/auto-melhoria.json']) {
    fs.mkdirSync(path.join(tmp, path.dirname(rel)), { recursive: true });
    fs.copyFileSync(path.join(RAIZ, rel), path.join(tmp, rel));
  }
  const alvo = path.join(tmp, 'razao-local.js');
  const fonte = fs.readFileSync(alvo, 'utf8').replace('  function probabilidade(q) {', '  function probabilidade(q) { return null;');
  fs.writeFileSync(alvo, fonte);
  let saida = '', codigo = 0;
  try {
    saida = execFileSync(process.execPath, [path.join(tmp, 'tools', 'auto-melhoria.js'), '--vigiar', '--fio=500'],
      { cwd: tmp, encoding: 'utf8', timeout: 240000, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    codigo = e.status || 1;
    saida = String(e.stdout || '') + String(e.stderr || '');
  }
  assert.equal(codigo, 1, 'o guarda deixou passar a cópia quebrada');
  assert(/NÃO publicar/.test(saida), 'o guarda reprovou sem dizer o motivo: ' + saida.slice(-300));
});

testa('pedir-mais: o produto sobe a própria barra e diz o que falta', () => {
  const saida = roda(['--pedir-mais', '--fio=1']);
  assert(/PEDIDO DE MELHORIA/.test(saida), 'sem patamar seguinte');
  assert(/falta \d+|já passou/.test(saida), 'sem distância medida no pedido de melhoria');
});

testa('robustez: a mesma prova escrita de outro jeito não muda de resposta', () => {
  const rel = JSON.parse(roda(['--json', '--fio=1']));
  assert(rel.robustez && typeof rel.robustez.total === 'number' && rel.robustez.total > 0, 'robustez não medida');
  assert.deepEqual(rel.robustez.mudou, [], 'resposta mudou com a redação: ' + rel.robustez.mudou.join(' · '));
  assert(rel.robustez.estaveis / rel.robustez.total >= 0.9, 'estabilidade sob reescrita abaixo de 90%: '
    + rel.robustez.estaveis + '/' + rel.robustez.total);
});

console.log('');
if (falhas.length) { console.error('✘ ' + falhas.length + ' de ' + (certos + falhas.length) + ' verificações FALHARAM'); process.exit(1); }
console.log('✔ ' + certos + '/' + (certos + falhas.length) + ' verificações do auto-diagnóstico passaram');
