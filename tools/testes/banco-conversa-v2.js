// Contrato offline (04/11/2026, v2): o banco SEM ECO do instrumento de conversa não pode apodrecer.
// Complementa tools/testes/banco-conversa.js (que cobre a v1) sem tocá-lo. V2 = mesmos 20 cenários
// e classes da v1, com os acks do assistente SEM eco de gabarito/proibição (mede retenção de turno 1,
// não fidelidade de contexto recente). Este contrato recalcula o placar do resultado v2 por conta própria.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const raiz = path.join(__dirname, '..', '..');
const banco = JSON.parse(fs.readFileSync(path.join(raiz, 'bench', 'banco-conversa-v2.json'), 'utf8'));
const resultado = JSON.parse(fs.readFileSync(path.join(raiz, 'bench', 'resultado-conversa-v2.json'), 'utf8'));
const medidor = fs.readFileSync(path.join(raiz, 'bench', 'medir-conversa.js'), 'utf8');

let aprovados = 0, total = 0;
function testa(nome, fn) {
  total++;
  try { fn(); aprovados++; console.log('✔ ' + nome); }
  catch (e) { console.log('✘ ' + nome + ' — ' + (e && e.message || e)); }
}

// Normalização da casa (mesma semântica do pontuar.js): minúsculas, sem acento, sem espaço duplo.
function normalizar(t) {
  return String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}
function casaEstrito(texto, padrao) {
  const n = normalizar(padrao);
  if (n.length > 0) return normalizar(texto).includes(n);
  return String(padrao).length > 0 && String(texto).includes(String(padrao));
}
function casaTermo(texto, termo) {
  // Termos numéricos curtos casam por fronteira de dígito (evita "7" casar em "17").
  if (/^[0-9.]+$/.test(termo)) return new RegExp('(^|[^0-9])' + termo.replace(/\./g, '\\.') + '([^0-9]|$)').test(texto);
  return casaEstrito(texto, termo);
}

testa('a v2 tem os mesmos 20 cenários com ids únicos', () => {
  assert.strictEqual(banco.length, 20, 'esperava 20 cenários');
  assert.strictEqual(new Set(banco.map(i => i.id)).size, 20, 'id repetido');
  assert.deepStrictEqual(banco.map(i => i.id).sort((a, b) => a - b), Array.from({ length: 20 }, (_, k) => k + 1));
});

testa('cada cenário tem 3+ turnos e o último turno é do Dono', () => {
  for (const it of banco) {
    assert(it.turnos.length >= 3, '#' + it.id + ': menos de 3 turnos');
    assert.strictEqual(it.turnos[it.turnos.length - 1].role, 'user', '#' + it.id + ': último turno não é do Dono');
  }
});

testa('as classes são as combinadas (P 5 · R 8 · C 7)', () => {
  const c = { P: 0, R: 0, C: 0 };
  for (const it of banco) c[it.classe]++;
  assert.deepStrictEqual(c, { P: 5, R: 8, C: 7 });
});

testa('o último turno nunca entrega a própria resposta', () => {
  for (const it of banco) {
    const fim = it.turnos[it.turnos.length - 1].content;
    for (const grupo of it.gabaritos || []) {
      const bate = grupo.filter(g => casaEstrito(fim, g) && normalizar(g).length >= 4);
      assert.strictEqual(bate.length, 0, '#' + it.id + ': pergunta final entrega a resposta ' + JSON.stringify(bate));
    }
  }
});

testa('todo cenário é julgável: a informação existe na conversa ou é conta declarada', () => {
  const calculados = [7, 18];
  for (const it of banco) {
    const antes = it.turnos.slice(0, -1).map(t => t.content).join(' \n ');
    const vemAntes = (it.gabaritos || []).some(g => g.some(x => normalizar(x).length >= 4 && casaEstrito(antes, x)));
    const temRestricao = (it.proibir || []).length > 0 && (it.gabaritos || []).length > 0;
    assert(vemAntes || calculados.includes(it.id) || temRestricao,
      'cenário ' + it.id + ': não há fato anterior, não é conta declarada e não há restrição para julgar');
  }
});

testa('nenhum termo proibido é também resposta certa', () => {
  // Contradição = MESMO termo nas duas listas (normalizado). Coincidência de substring
  // ("Danda" dentro de "Dandara", #3) não é contradição: o violou pune o nome inteiro e
  // o ok=false decorre; fica declarada como limitação do matcher no relatório v2.
  for (const it of banco) {
    const certas = (it.gabaritos || []).flat().map(normalizar);
    for (const p of it.proibir || []) {
      assert(!certas.includes(normalizar(p)),
        '#' + it.id + ': proibido ' + JSON.stringify(p) + ' também é gabarito');
    }
  }
});

testa('SEM ECO: nenhum ack do assistente repete gabarito nem proibido', () => {
  for (const it of banco) {
    const termos = [...(it.gabaritos || []).flat(), ...(it.proibir || [])];
    for (const t of it.turnos) {
      if (t.role !== 'assistant') continue;
      for (const termo of termos) {
        if (!termo) continue;
        assert(!casaTermo(t.content, termo),
          '#' + it.id + ': ack ecoa ' + JSON.stringify(termo));
      }
    }
  }
});

testa('as contas e a recomendação seguem declaradas nas notas (7, 18 e 10)', () => {
  for (const id of [7, 18]) {
    const it = banco.find(x => x.id === id);
    assert(/conta declarada/i.test(it.nota || ''), '#' + id + ': conta não declarada na nota');
  }
  const dez = banco.find(x => x.id === 10);
  assert(/recomenda[cç][aã]o declarada/i.test(dez.nota || ''), '#10: recomendação não declarada na nota');
});

testa('o resultado v2 tem uma resposta pareada por cenário, com chamadas e respostas coerentes', () => {
  assert.strictEqual(resultado.agenda.length, 40, 'esperava agenda de 40');
  assert.strictEqual(resultado.res.length, 40, 'esperava 40 células');
  for (const it of banco) {
    const linhas = resultado.res.filter(r => r.id === it.id);
    assert.strictEqual(linhas.length, 2, '#' + it.id + ': esperava 1 A e 1 B');
    assert.strictEqual(new Set(linhas.map(r => r.versao)).size, 2, '#' + it.id + ': versão repetida');
  }
  for (const v of ['A', 'B']) {
    const linhas = resultado.res.filter(r => r.versao === v);
    const comTexto = linhas.filter(r => r.texto && r.texto.trim().length > 0);
    const declaradas = linhas.filter(r => !r.texto || r.texto.trim().length === 0);
    for (const d of declaradas) assert(d.erro, 'célula vazia sem motivo declarado: #' + d.id + ' ' + d.versao);
    const s = resultado.sum && resultado.sum.total && resultado.sum.total[v];
    if (s) {
      assert.strictEqual(s.chamadas, linhas.length, v + ': chamadas não batem');
      assert.strictEqual(s.respostas, comTexto.length, v + ': respostas não batem');
    }
  }
  assert.strictEqual(resultado.completo, resultado.res.every(r => r.texto && r.texto.trim().length > 0),
    'flag completo não bate com a presença de texto em toda célula');
});

testa('o placar publicado do v2 reproduz por conta própria', () => {
  function retem(texto, it) {
    if (!texto) return false;
    return (it.gabaritos || []).every(grupo => grupo.some(alt => casaEstrito(texto, alt)));
  }
  function violou(texto, it) {
    if (!texto) return false;
    return (it.proibir || []).some(p => casaEstrito(texto, p));
  }
  for (const [classe, escopo] of [['P', 'P'], ['R', 'R'], ['C', 'C'], ['total', null]]) {
    for (const v of ['A', 'B']) {
      const linhas = resultado.res.filter(r => r.versao === v && (!escopo || r.classe === escopo));
      const recalc = {
        retem: linhas.filter(r => { const it = banco.find(x => x.id === r.id); return retem(r.texto, it); }).length,
        violou: linhas.filter(r => { const it = banco.find(x => x.id === r.id); return violou(r.texto, it); }).length
      };
      const s = resultado.sum[classe][v];
      assert.strictEqual(s.retem, recalc.retem, classe + '/' + v + ': retem divergiu (' + s.retem + ' vs ' + recalc.retem + ')');
      assert.strictEqual(s.violou, recalc.violou, classe + '/' + v + ': violou divergiu');
      const recalcOk = linhas.filter(r => {
        const it = banco.find(x => x.id === r.id);
        return retem(r.texto, it) && !violou(r.texto, it);
      }).length;
      assert.strictEqual(s.ok, recalcOk, classe + '/' + v + ': ok divergiu');
    }
  }
});

testa('medidor sem placar escrito à mão e sem segredo/URL de provedor em banco e resultado', () => {
  assert(!/\d+\s*×\s*\d+/.test(medidor), 'medidor contém placar literal');
  const bruto = JSON.stringify(resultado) + JSON.stringify(banco);
  assert(!/sk-[A-Za-z0-9]{8,}/.test(bruto), 'segredo no bruto');
  assert(!/https?:\/\/[^\s"]+\/(v1|api)/.test(bruto), 'URL de provedor no bruto');
});

console.log(aprovados + '/' + total + ' contratos do banco de conversa v2 passaram');
if (aprovados !== total) process.exit(1);
