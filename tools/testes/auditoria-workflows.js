// Auditoria offline das guardas de workflows: pin, privilégio explícito e isolamento do navegador público.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '../..');
const pasta = path.join(raiz, '.github', 'workflows');
const arquivos = fs.readdirSync(pasta).filter(x => /\.ya?ml$/i.test(x)).sort();
const ler = nome => fs.readFileSync(path.join(pasta, nome), 'utf8');
let certos = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }

function chavesRepetidasNosSteps(texto) {
  const repetidas = [];
  let indentacaoSteps = null;
  let indentacaoStep = null;
  let chaves = new Set();
  const finalizarStep = () => { chaves = new Set(); };

  for (const [indice, linha] of texto.split(/\r?\n/).entries()) {
    const semInicio = linha.replace(/^\s*/, '');
    const indentacao = linha.length - semInicio.length;
    const visivel = semInicio.trim();
    if (/^\s*steps:\s*$/.test(linha)) {
      finalizarStep();
      indentacaoSteps = indentacao;
      indentacaoStep = null;
      continue;
    }
    if (indentacaoSteps === null) continue;
    if (visivel && !visivel.startsWith('#') && indentacao <= indentacaoSteps) {
      finalizarStep();
      indentacaoSteps = null;
      indentacaoStep = null;
      continue;
    }

    let candidato = null;
    if (indentacao === indentacaoSteps + 2 && /^-\s+/.test(semInicio)) {
      finalizarStep();
      indentacaoStep = indentacao;
      candidato = semInicio.slice(2);
    } else if (indentacaoStep !== null && indentacao === indentacaoStep + 2) {
      candidato = semInicio;
    }
    if (candidato === null) continue;
    const chave = /^([A-Za-z0-9_-]+):/.exec(candidato);
    if (!chave) continue;
    if (chaves.has(chave[1])) repetidas.push(chave[1] + '@' + (indice + 1));
    else chaves.add(chave[1]);
  }
  return repetidas;
}

ok('todos os workflows declaram permissões e runner Ubuntu 24.04', () => {
  assert(arquivos.length >= 10, 'inventário inesperadamente curto');
  for (const nome of arquivos) {
    const texto = ler(nome);
    assert.match(texto, /^permissions:\n(?: {2,}.+\n)+/m, nome + ' sem permissions explícitas');
    assert.match(texto, /^\s*runs-on:\s*ubuntu-24\.04\s*$/m, nome + ' não fixa ubuntu-24.04');
  }
});

ok('todas as actions externas estão fixadas por SHA completo', () => {
  for (const nome of arquivos) {
    const usos = [...ler(nome).matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)];
    assert(usos.length || nome === 'ferramentas.yml', nome + ' sem action esperada');
    for (const uso of usos) assert.match(uso[1], /@[a-f0-9]{40}$/i, nome + ' usa referência não imutável: ' + uso[1]);
  }
});

ok('workflows não repetem chaves no mesmo step', () => {
  const exemplo = 'jobs:\n  teste:\n    steps:\n      - name: amostra\n        run: primeiro\n        run: segundo\n';
  assert.deepEqual(chavesRepetidasNosSteps(exemplo), ['run@6'], 'fixture não prova o detector');
  for (const nome of arquivos) {
    assert.deepEqual(chavesRepetidasNosSteps(ler(nome)), [], nome + ' repete chave dentro de step');
  }
});

ok('todas as actions usadas são de propriedade do GitHub', () => {
  for (const nome of arquivos) {
    for (const uso of ler(nome).matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)) {
      assert.match(uso[1], /^actions\/[A-Za-z0-9_/-]+@[a-f0-9]{40}$/i, nome + ' não usa action GitHub-owned: ' + uso[1]);
    }
  }
});

ok('não há gatilho pull_request_target e o orçamento de escrita é explícito', () => {
  const escreveConteudo = new Set(['coleta-email.yml', 'dossie-preparo-controlado.yml', 'email.yml', 'evolucao.yml', 'ferramentas.yml', 'navegador-publico.yml', 'reforco-dossie-controlado.yml', 'teste-email.yml', 'vigia.yml']);
  const escreveAcoes = new Set(['email.yml', 'vigia.yml']);
  for (const nome of arquivos) {
    const texto = ler(nome);
    assert(!/^\s*pull_request_target:\s*$/m.test(texto), nome + ' não pode usar pull_request_target');
    const conteudo = /^\s*contents:\s*write\s*$/m.test(texto);
    const acoes = /^\s*actions:\s*write\s*$/m.test(texto);
    assert.equal(conteudo, escreveConteudo.has(nome), nome + ' divergiu do orçamento de contents: write');
    assert.equal(acoes, escreveAcoes.has(nome), nome + ' divergiu do orçamento de actions: write');
  }
});

ok('saídas operacionais não escrevem em main e usam publicador literal revisável', () => {
  const perfis = {
    'email.yml': 'email',
    'evolucao.yml': 'evolucao',
    'ferramentas.yml': 'ferramentas',
    'vigia.yml': 'vigia',
    'coleta-email.yml': 'coleta',
    'teste-email.yml': 'teste-email'
  };
  for (const [nome, perfil] of Object.entries(perfis)) {
    const texto = ler(nome);
    assert.match(texto, new RegExp('estado-operacional-controlado\\.js publicar ' + perfil.replace('-', '\\-')),
      nome + ' não chama o publicador de escopo fechado');
    assert.doesNotMatch(texto, /\bgit\s+(?:push|pull|reset|fetch)\b|HEAD:main|refs\/heads\/main/i,
      nome + ' ainda tem caminho de escrita/sincronização de main');
  }
  assert.match(ler('email.yml'), /estado-operacional-controlado\.js preparar email/);
  assert.match(ler('vigia.yml'), /estado-operacional-controlado\.js preparar vigia/);
  const evolucao = ler('evolucao.yml');
  assert.match(evolucao, /estado-operacional-controlado\.js preparar evolucao/);
  assert.match(evolucao, /estado-operacional-controlado\.js atualizar-vigia evolucao/);
});

ok('publicador de estado aceita somente perfis, ramo e arquivos fechados', () => {
  const ferramenta = fs.readFileSync(path.join(raiz, 'tools', 'estado-operacional-controlado.js'), 'utf8');
  assert.match(ferramenta, /const RAMO = 'estado\/operacional';/);
  for (const perfil of ['email', 'evolucao', 'vigia', 'ferramentas', 'coleta', "'teste-email'"]) assert(ferramenta.includes(perfil), 'perfil ausente: ' + perfil);
  assert.match(ferramenta, /refs\/heads\/estado\/operacional/);
  assert.match(ferramenta, /GITHUB_RUN_ID numérico é obrigatório/);
  assert.match(ferramenta, /nlink !== 1/);
  assert.match(ferramenta, /sufixoAppendOnlyDoLog/);
  assert.match(ferramenta, /não sobrescrevi/);
  assert.doesNotMatch(ferramenta, /--force|refs\/heads\/main|HEAD:main/);
});

ok('status do e-mail lê somente a fotografia sanitizada do ramo de estado', () => {
  const chat = fs.readFileSync(path.join(raiz, 'tools', 'email-chat.js'), 'utf8');
  assert.match(chat, /chat\/estado\/operacional\/vigia-estado\.json/);
  assert.doesNotMatch(chat, /chat\/main\/vigia-estado\.json/);
});

ok('dossiê controlado tem escrita mínima, origem fixa e nenhum dado secreto', () => {
  const dossie = ler('dossie-preparo-controlado.yml');
  assert.match(dossie, /^permissions:\n  contents: write\s*$/m);
  assert.doesNotMatch(dossie, /^\s*(?:actions|pull-requests):\s*write\s*$/m);
  assert.match(dossie, /^on:\n  workflow_dispatch:\s*$/m);
  assert.match(dossie, /\[ "\$GITHUB_REF" = 'refs\/heads\/main' \] \|\|/);
  assert.match(dossie, /git remote get-url origin/);
  assert.match(dossie, /github\.com\/reboclbrank-max\/chat/);
  assert.match(dossie, /node tools\/preparo-controlado\.js/);
  assert.match(dossie, /node tools\/dossie-preparo-controlado\.js/);
  assert.match(dossie, /git add -- propostas\/central\/dossie-preparo-controlado\.md/);
  assert.match(dossie, /git push origin "HEAD:refs\/heads\/\$ramo"/);
  assert.doesNotMatch(dossie, /secrets\.|inputs:|--force|git merge|gh pr\b|git push[^\n]*(?:HEAD:main|refs\/heads\/main)/i);
});

ok('reforço controlado cria somente um ramo revisável de três caminhos', () => {
  const reforco = ler('reforco-dossie-controlado.yml');
  assert.match(reforco, /^permissions:\n  contents: write\s*$/m);
  assert.doesNotMatch(reforco, /^\s*(?:actions|pull-requests):\s*write\s*$/m);
  assert.match(reforco, /^on:\n  workflow_dispatch:\s*$/m);
  assert.match(reforco, /\[ "\$GITHUB_REF" = 'refs\/heads\/main' \] \|\|/);
  assert.match(reforco, /git remote get-url origin/);
  assert.match(reforco, /github\.com\/reboclbrank-max\/chat/);
  assert.match(reforco, /node tools\/preparo-controlado\.js/);
  assert.match(reforco, /node tools\/testes\/reforco-dossie-controlado\.js/);
  assert.match(reforco, /node tools\/reforco-dossie-controlado\.js/);
  assert.match(reforco, /node tools\/testes\/dossie-preparo-controlado\.js/);
  assert.match(reforco, /git add -- \.github\/workflows\/dossie-preparo-controlado\.yml tools\/testes\/dossie-preparo-controlado\.js propostas\/central\/reforco-dossie-controlado\.md/);
  assert.match(reforco, /git diff --cached --check/);
  assert.match(reforco, /alterados="\$\(git diff --cached --name-only\)"/);
  assert.match(reforco, /ramo="central\/reforco-dossie-\$\{GITHUB_RUN_ID\}"/);
  assert.doesNotMatch(reforco, /secrets\.|inputs:|--force|git merge|gh pr\b|git push[^\n]*(?:HEAD:main|refs\/heads\/main)/i);
});

ok('barreira rápida roda também na PR humana para viabilizar proteção de main', () => {
  const rapido = ler('testes-rapidos.yml');
  assert.match(rapido, /^  pull_request:\n    branches: \[main\]\s*$/m);
  assert.doesNotMatch(rapido, /pull_request_target/);
});

ok('barreira rápida prepara e exige OCR português e renderizador de PDF', () => {
  const rapido = ler('testes-rapidos.yml');
  assert.match(rapido, /command -v pdftotext >\/dev\/null/);
  assert.match(rapido, /command -v pdftoppm >\/dev\/null/);
  assert.match(rapido, /faltam="\$faltam poppler-utils"/);
  assert.match(rapido, /tesseract --list-langs 2>\/dev\/null \| grep -qx por/);
  assert.match(rapido, /faltam="\$faltam tesseract-ocr tesseract-ocr-por"/);
  assert.match(rapido, /sudo apt-get install -y -qq \$faltam/);
  assert.match(rapido, /REBOCL_EXIGIR_MULTIMODAL: '1'/);
});

ok('barreira rápida observa e valida a sintaxe de ferramentas Shell', () => {
  const rapido = ler('testes-rapidos.yml');
  assert.match(rapido, /'tools\/\*\*\/\*\.sh'/);
  assert.match(rapido, /for f in tools\/testes\/\*\.sh; do bash -n "\$f"; done/);
});

ok('turno de e-mail usa por padrão o mesmo modelo do exame; reserva leve não carrega visão', () => {
  const email = ler('email.yml');
  const ferramentas = ler('ferramentas.yml');
  const modelos = [...email.matchAll(/^\s*VISAO_MODELO:\s*([^\s#]+)\s*$/gm)].map(x => x[1]);
  const entrada = /inputs:\n\s+visao:\n[\s\S]*?^\s+default:\s*'([^']+)'\s*$/m.exec(ferramentas);
  assert.equal(modelos.length, 1, 'somente o leitor longo deve preparar VISAO_MODELO');
  assert(!/^\s*VISAO_PEDIDO:/m.test(email), 'modo de visão não pode mudar sem prova e auditoria correspondente');
  assert(entrada, 'ferramentas.yml sem padrão de visão explícito');
  assert.equal(entrada[1], modelos[0], 'o exame padrão diverge do modelo normal usado pelo turno');
});

ok('indicador diário usa a sonda remota mais recente do ramo de estado', () => {
  const evolucao = ler('evolucao.yml');
  const iPrepara = evolucao.indexOf('estado-operacional-controlado.js preparar evolucao');
  const iExame = evolucao.indexOf('node tools/evolucao-chat.js');
  const iAtualiza = evolucao.indexOf('estado-operacional-controlado.js atualizar-vigia evolucao');
  const iIndice = evolucao.indexOf('node tools/indice-capacidade.js');
  assert(iPrepara >= 0 && iPrepara < iExame, 'exame precisa iniciar com a fotografia de estado');
  assert(iAtualiza >= 0 && iAtualiza < iIndice, 'indicador não pode usar sonda do checkout antigo');
  assert.doesNotMatch(evolucao, /origin\/main|HEAD:main|refs\/heads\/main/);
});

ok('navegador público recebe só URL e referência opaca, antes de ter token', () => {
  const texto = ler('navegador-publico.yml');
  const entradas = [...texto.matchAll(/^      ([a-z_]+):\n        description:/gm)].map(x => x[1]);
  assert.deepEqual(entradas, ['url', 'referencia']);
  assert(!/\$\{\{\s*secrets\./i.test(texto), 'workflow isolado não recebe secrets');
  const antesDoPush = texto.split('- name: Salva a trilha pública depois da navegação')[0];
  assert(!/github\.token|GITHUB_TOKEN|Authorization:/i.test(antesDoPush), 'Chrome não pode receber token antes do push');
  assert.match(texto, /(?:refer[eê]ncia|identificador)[^\n]*opac/i);
});

console.log(`${certos}/${certos + falhas} testes da auditoria de workflows passaram`);
process.exitCode = falhas ? 1 : 0;
