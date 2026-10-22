// 🧪 Oficina controlada: receita fixa, workflow somente-leitura e ponte fechada.
'use strict';
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '..', '..');
const preparo = require(path.join(raiz, 'tools', 'preparo-controlado.js'));
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0, falhas = 0;
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function ler(nome) { return fs.readFileSync(path.join(raiz, nome), 'utf8'); }
function entre(texto, inicio, fim) {
  const a = texto.indexOf(inicio), b = texto.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho ausente: ' + inicio);
  return texto.slice(a, b);
}

testa('receita do preparo é um catálogo imutável de verificações locais', () => {
  assert(Object.isFrozen(preparo.CHECAGENS));
  assert.deepEqual(preparo.CHECAGENS.map((item) => item.arquivo), [
    'tools/testes/central-operacional.js',
    'tools/testes/comandos-locais-interface.js',
    'tools/testes/pwa-atualizacao-segura.js',
    'tools/testes/continuidade.js',
    'tools/testes/auditoria-workflows.js'
  ]);
  for (const item of preparo.CHECAGENS) assert(Object.isFrozen(item));
  assert.deepEqual(preparo.validarArgumentos([]), { ok: true });
  assert.equal(preparo.validarArgumentos(['qualquer']).ok, false);
});

testa('preparo chama somente Node e testes pré-definidos, sem shell livre', () => {
  const chamadas = [];
  const resultado = preparo.executarPreparo({
    raiz: '/controle',
    executar: (binario, args, opcoes) => {
      chamadas.push({ binario, args, opcoes });
      return { status: 0 };
    }
  });
  assert.equal(resultado.estado, 'pronto_para_revisao');
  assert.equal(chamadas.length, preparo.CHECAGENS.length);
  for (let i = 0; i < chamadas.length; i++) {
    assert.equal(chamadas[i].binario, process.execPath);
    assert.equal(chamadas[i].args.length, 1);
    assert.equal(chamadas[i].args[0], path.join('/controle', preparo.CHECAGENS[i].arquivo));
    assert.equal(chamadas[i].opcoes.shell, false);
    assert.equal(chamadas[i].opcoes.cwd, '/controle');
  }
  assert.match(resultado.proximoPasso, /Revisão humana/);
  assert.match(preparo.resumoMarkdown(resultado), /sem branch, commit, push, merge, segredo, conta ou publicação/);
});

testa('falha de guarda interrompe a receita, bloqueia revisão e não vira promoção', () => {
  let n = 0;
  const resultado = preparo.executarPreparo({
    raiz: '/controle',
    executar: () => ({ status: ++n === 3 ? 1 : 0 })
  });
  assert.equal(resultado.estado, 'bloqueado');
  assert.equal(n, 3, 'a receita para na primeira guarda que falha');
  assert.equal(resultado.resultados.length, 3, 'guardas posteriores não são executadas');
  assert.equal(resultado.resultados.filter((item) => !item.passou).length, 1);
  assert.match(resultado.proximoPasso, /Não preparar mudança, branch ou promoção/);
  const resumo = preparo.resumoMarkdown(resultado);
  assert.match(resumo, /bloqueado/);
  assert.doesNotMatch(resumo, /erro bruto|token|Authorization/i);
});

testa('ferramenta não introduz avaliador livre ou transporte', () => {
  const fonte = ler('tools/preparo-controlado.js');
  assert.match(fonte, /spawnSync/);
  assert.match(fonte, /shell: false/);
  assert.doesNotMatch(fonte, /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|execSync|exec\s*\(|eval\s*\(|new Function|https?:)\b/i);
  assert.doesNotMatch(fonte, /process\.argv[\s\S]{0,180}(?:arquivo|workflow|ref|repo)/i);
});

testa('workflow manual é somente-leitura e executa a receita literal', () => {
  const workflow = ler('.github/workflows/preparo-controlado.yml');
  assert.match(workflow, /^\s*workflow_dispatch:\s*$/m);
  assert.match(workflow, /^permissions:\n\s+contents:\s+read\s*$/m);
  assert.match(workflow, /^\s*runs-on:\s*ubuntu-24\.04\s*$/m);
  assert.match(workflow, /^\s*timeout-minutes:\s*8\s*$/m);
  assert.match(workflow, /actions\/checkout@[a-f0-9]{40}/i);
  assert.match(workflow, /actions\/setup-node@[a-f0-9]{40}/i);
  assert.match(workflow, /set -o pipefail/);
  assert.match(workflow, /node tools\/preparo-controlado\.js \| tee -a "\$GITHUB_STEP_SUMMARY"/);
  assert.doesNotMatch(workflow, /contents:\s*write|actions:\s*write|git (?:commit|push|checkout)|gh |curl |secrets\.|inputs:/i);
});

const pontes = [], allowlists = [];
for (const rota of rotas) {
  const html = ler(rota);
  testa(rota + ' limita o preparo ao comando exato e ao workflow literal', () => {
    const ponte = entre(html, "  if (/^!prepararchat(?:\\s|$)/.test(m)) {", "  if (/^!dossiechat(?:\\s|$)/.test(m)) {");
    assert.match(ponte, /\^!prepararchat\(\?:\\s\|\$\)\/\.test\(m\)/);
    assert.match(ponte, /if \(m !== '!prepararchat'\) return '⚠️ uso: !prepararchat/);
    assert.match(ponte, /modoSomenteLocalAtivo\(\)/);
    assert.match(ponte, /if \(!token\) return/);
    assert.match(ponte, /operacaoCentralEmCurso/);
    assert.match(ponte, /preparoChatEmCurso/);
    assert.match(ponte, /5 \* 60 \* 1000/);
    assert.match(ponte, /\/repos\/reboclbrank-max\/chat\/actions\/workflows\/preparo-controlado\.yml\/dispatches/);
    assert.match(ponte, /JSON\.stringify\(\{ ref: 'main' \}\)/);
    assert.doesNotMatch(ponte, /eval\s*\(|new Function|child_process|\/bin\/|workflow\s*:\s*m|ref\s*:\s*m|\$\{[^}]*m/i);
    assert.equal((ponte.match(/api\s*\(/g) || []).length, 1);
    pontes.push(ponte);
  });
  testa(rota + ' permite o preparo na allowlist sem capturar vizinhos', () => {
    const fonte = entre(html, 'function ehComandoPrivadoLocal(texto) {', '\nasync function enviar()');
    const ehPrivado = new Function(fonte + '\nreturn ehComandoPrivadoLocal;')();
    for (const entrada of ['!prepararchat', '!prepararchat auditoria', '!prepararchat\tauditoria']) assert.equal(ehPrivado(entrada), true, entrada);
    for (const entrada of ['!prepararchats', '!preparar', '!prepararchatx']) assert.equal(ehPrivado(entrada), false, entrada);
    allowlists.push(fonte);
  });
}
testa('ponte e allowlist do preparo mantêm paridade nas quatro rotas', () => {
  assert.equal(new Set(pontes.map((fonte) => crypto.createHash('sha256').update(fonte).digest('hex'))).size, 1);
  assert.equal(new Set(allowlists.map((fonte) => crypto.createHash('sha256').update(fonte).digest('hex'))).size, 1);
});

testa('Central, continuidade e casca documentam o preparo sem promover código', () => {
  const local = require(path.join(raiz, 'chat-comandos-locais.js'));
  assert.match(local.respostaComandoOperacionalLocal('operar: preparo'), /auditoria interna fixa/);
  assert.match(local.respostaComandoOperacionalLocal('operar: preparo'), /não cria branch, código ou promoção/);
  assert.match(local.respostaComandoOperacionalLocal('operar: preparo livre'), /texto livre não é executado/);
  const contrato = ler('OPERACAO-CENTRAL.md');
  const continuidade = ler('CONTINUIDADE.md');
  const workflowRapido = ler('.github/workflows/testes-rapidos.yml');
  const sw = ler('sw.js');
  assert.match(contrato, /!prepararchat/);
  assert.match(contrato, /auditoria interna fixa/);
  assert.match(contrato, /não cria branch/i);
  assert.match(continuidade, /!prepararchat/);
  assert.match(workflowRapido, /tools\/preparo-controlado\.js/);
  assert.match(sw, /rebocl-chat-v92/);
});

console.log(`${certos}/${certos + falhas} testes do preparo controlado passaram`);
process.exitCode = falhas ? 1 : 0;
