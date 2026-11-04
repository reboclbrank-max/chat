// Contrato offline (04/11/2026): o instrumento de conversa do M01 não pode apodrecer.
//
// O que ele cerca:
//   * o banco tem 20 cenários, ids únicos, cada um com 3+ turnos e o último do Dono;
//   * a chave de cada cenário é MESMO apresentada no primeiro turno (é o que dá sentido ao teste);
//   * o termo proibido (decoy) nunca é também resposta certa — senão o gabarito se contradiz;
//   * o resultado publicado reproduz: 40 respostas, 1 A e 1 B por item, e o placar recalculado
//     aqui (independente do medidor) bate com o `sum` gravado;
//   * nada de placar escrito à mão nem de segredo no banco/resultado.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..', '..');
const banco = JSON.parse(fs.readFileSync(path.join(raiz, 'bench', 'banco-conversa.json'), 'utf8'));
const resultado = JSON.parse(fs.readFileSync(path.join(raiz, 'bench', 'resultado-conversa.json'), 'utf8'));
const medidor = fs.readFileSync(path.join(raiz, 'bench', 'medir-conversa.js'), 'utf8');

let certos = 0, falhas = 0;
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
}

// Normalização igual à do medidor, com a lição do emoji: símbolo que vira vazio casa só cru.
function normalizar(texto) {
  return String(texto == null ? '' : texto).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}
function casa(alvo, texto) {
  const a = normalizar(alvo);
  if (a) return normalizar(texto).includes(a);
  return String(texto == null ? '' : texto).includes(alvo);
}

testa('o banco tem 20 cenários com ids únicos', () => {
  assert.strictEqual(banco.length, 20, 'esperava 20 cenários');
  assert.strictEqual(new Set(banco.map(i => i.id)).size, 20, 'id repetido no banco');
  assert.deepStrictEqual(banco.map(i => i.id).sort((a, b) => a - b), Array.from({ length: 20 }, (_, k) => k + 1));
});

testa('cada cenário tem 3+ turnos e o último turno é do Dono', () => {
  for (const item of banco) {
    assert(item.turnos.length >= 3, 'cenário ' + item.id + ' tem menos de 3 turnos');
    assert.strictEqual(item.turnos[item.turnos.length - 1].role, 'user', 'cenário ' + item.id + ' não termina com fala do Dono');
  }
});

testa('as classes são as combinadas (P 5 · R 8 · C 7)', () => {
  const conta = { P: 0, R: 0, C: 0 };
  for (const item of banco) {
    assert(Object.prototype.hasOwnProperty.call(conta, item.classe), 'classe desconhecida: ' + item.classe);
    conta[item.classe]++;
  }
  assert.deepStrictEqual(conta, { P: 5, R: 8, C: 7 });
});

testa('o último turno nunca entrega a própria resposta', () => {
  for (const item of banco) {
    const final = item.turnos[item.turnos.length - 1].content;
    for (const grupo of item.gabaritos) {
      assert(Array.isArray(grupo) && grupo.length > 0, 'cenário ' + item.id + ' tem grupo de gabarito vazio');
      assert(!grupo.some(termo => casa(termo, final)),
        'cenário ' + item.id + ': a resposta ' + JSON.stringify(grupo) + ' está escrita no próprio pedido');
    }
  }
});

testa('todo cenário é julgável: a informação existe na conversa ou é conta declarada', () => {
  // Os dois aritméticos (7 e 18) não têm a resposta escrita em lugar nenhum: ela é calculada dos
  // operandos do turno 1. A lista é fechada de propósito — cenário novo não entra nessa desculpa
  // sem alguém dizer aqui.
  const calculados = [7, 18];
  for (const item of banco) {
    const antes = item.turnos.slice(0, -1).map(t => t.content).join(' ');
    const vemAntes = item.gabaritos.some(grupo => grupo.some(termo => casa(termo, antes)));
    // Terceira forma legítima: cenário de RECOMENDAÇÃO, julgado pelo que ele proíbe (o decoy),
    // não por um fato a repetir. Sem `proibir`, seria impossível julgar a resposta.
    const temRestricao = (item.proibir || []).length > 0;
    assert(vemAntes || calculados.includes(item.id) || temRestricao,
      'cenário ' + item.id + ': não há fato anterior, não é conta declarada e não há restrição para julgar');
  }
});

testa('nenhum termo proibido é também resposta certa', () => {
  for (const item of banco) {
    const certos = new Set(item.gabaritos.flat().map(normalizar).filter(Boolean));
    for (const proibido of item.proibir || []) {
      assert(!certos.has(normalizar(proibido)), 'cenário ' + item.id + ': "' + proibido + '" é gabarito e decoy ao mesmo tempo');
    }
  }
});

testa('o resultado tem uma resposta A e uma B por cenário', () => {
  assert.strictEqual(resultado.res.length, 40, 'esperava 40 respostas');
  for (const item of banco) {
    const versoes = resultado.res.filter(r => r.id === item.id).map(r => r.versao).sort();
    assert.deepStrictEqual(versoes, ['A', 'B'], 'cenário ' + item.id + ' não tem exatamente A e B');
  }
  assert.strictEqual(resultado.completo, true, 'a rodada precisa estar completa');
  assert.strictEqual(resultado.invalido, false, 'a rodada foi marcada como inválida');
});

testa('o placar publicado reproduz por conta própria', () => {
  const conta = {};
  const zerar = () => ({ A: { retem: 0, violou: 0, ok: 0 }, B: { retem: 0, violou: 0, ok: 0 } });
  for (const linha of resultado.res) {
    const item = banco.find(i => i.id === linha.id);
    const texto = linha.texto || '';
    const retem = item.gabaritos.every(grupo => grupo.some(termo => casa(termo, texto)));
    const violou = (item.proibir || []).some(termo => casa(termo, texto));
    conta[item.classe] = conta[item.classe] || zerar();
    conta[item.classe][linha.versao].retem += retem ? 1 : 0;
    conta[item.classe][linha.versao].violou += violou ? 1 : 0;
    conta[item.classe][linha.versao].ok += (retem && !violou) ? 1 : 0;
  }
  const total = zerar();
  for (const classe of Object.keys(conta)) {
    for (const versao of ['A', 'B']) {
      for (const campo of ['retem', 'violou', 'ok']) {
        assert.strictEqual(conta[classe][versao][campo], resultado.sum[classe][versao][campo],
          'divergiu em ' + classe + '/' + versao + '/' + campo);
        total[versao][campo] += conta[classe][versao][campo];
      }
    }
  }
  for (const versao of ['A', 'B']) {
    for (const campo of ['retem', 'violou', 'ok']) {
      assert.strictEqual(total[versao][campo], resultado.sum.total[versao][campo], 'total divergiu em ' + versao + '/' + campo);
    }
  }
});

testa('célula sem resposta é contada, com motivo, e não passa de uma', () => {
  // A rodada real tem 1 célula vazia (A, cenário 14, "eco de instrução"). Ela é auditável e o
  // contrato a declara: se aparecer outra, alguém mexeu no material sem dizer.
  const vazias = resultado.res.filter(l => !(typeof l.texto === 'string' && l.texto.trim()));
  assert(vazias.length <= 1, 'células vazias demais: ' + vazias.length);
  for (const vazia of vazias) {
    assert(vazia.erro, 'célula vazia ' + vazia.id + '/' + vazia.versao + ' sem motivo registrado');
  }
  for (const linha of resultado.res) {
    assert(Number.isFinite(linha.ctxChars) && linha.ctxChars >= 0, 'linha ' + linha.id + ' sem ctxChars');
    assert(Number.isFinite(linha.ms), 'linha ' + linha.id + ' sem latência');
  }
});

testa('o medidor reusa a pontuação da casa e não carrega placar escrito à mão', () => {
  assert(/require\(['"]\.\/pontuar\.js['"]\)/.test(medidor), 'o medidor deveria reusar bench/pontuar.js');
  assert(!/18\s*[x×]\s*15/.test(medidor), 'placar não pode estar escrito dentro do medidor');
  assert(!/17\s*[x×]\s*14/.test(medidor), 'placar não pode estar escrito dentro do medidor');
});

testa('banco e resultado não trazem segredo nem URL de provedor', () => {
  const bruto = fs.readFileSync(path.join(raiz, 'bench', 'banco-conversa.json'), 'utf8') +
    fs.readFileSync(path.join(raiz, 'bench', 'resultado-conversa.json'), 'utf8');
  assert(!/ghp_|github_pat_|sk-[A-Za-z0-9]{10}|Bearer\s+[A-Za-z0-9]/.test(bruto), 'padrão de segredo no material do banco');
});

console.log(certos + '/' + (certos + falhas) + ' contratos do banco de conversa passaram');
if (falhas) process.exitCode = 1;
