// Contrato do cache de ferramentas do turno de e-mail — 2026-10-24.
// O turno reinstalava ~14 pacotes Python a cada execução (8 por dia), pagando
// download e build do zero. O venv agora é cacheado; este contrato garante que o
// ganho não vira risco: cache é opcional, o fallback antigo continua existindo e
// nada de segredo, canal ou conteúdo passa a ser guardado.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '../..');
const email = fs.readFileSync(path.join(raiz, '.github/workflows/email.yml'), 'utf8');
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

ok('o turno restaura e guarda o venv das ferramentas com chave fixa', () => {
  assert.match(email, /actions\/cache\/restore@[0-9a-f]{40} # v4/, 'restore do venv precisa estar fixado por SHA');
  assert.match(email, /actions\/cache\/save@[0-9a-f]{40} # v4/, 'save do venv precisa estar fixado por SHA');
  assert.match(email, /path: \/home\/runner\/\.venv-casa/, 'caminho do venv mudou');
  const chaves = [...email.matchAll(/key: (venv-casa-[a-z0-9.-]+)/g)].map((m) => m[1]);
  assert(chaves.length === 2, 'restore e save precisam usar a mesma chave');
  assert.equal(chaves[0], chaves[1], 'chaves diferentes entre restore e save');
});

ok('o venv em cache só é aceito se os imports essenciais funcionarem', () => {
  assert.match(email, /\.venv-casa\/bin\/python3 -c "import numpy, PIL, openpyxl, pypdf, docx, cv2"/, 'falta a verificação de import');
});

ok('sem venv, o caminho antigo continua como fallback', () => {
  assert.match(email, /python3 -m pip install --quiet --disable-pip-version-check --break-system-packages/, 'fallback do python do sistema foi removido');
  assert.match(email, /if python3 -m venv \/home\/runner\/\.venv-casa/, 'criação do venv sem guarda de falha');
});

ok('o marcador de ferramentas e o PATH do turno são preservados', () => {
  assert.match(email, /touch \/tmp\/ferramentas-prontas/, 'marcador das ferramentas desapareceu');
  assert.match(email, /FERRAMENTAS_MARCADOR=\/tmp\/ferramentas-prontas/, 'variável do marcador desapareceu');
  assert.match(email, /export PATH="\/home\/runner\/\.venv-casa\/bin:\$PATH"/, 'o turno não aponta para o venv');
});

ok('a duração do preparo é medida sem conteúdo nem segredo', () => {
  assert.match(email, /INICIO_PREPARO=\$\(date \+%s\)/, 'sem marca de início');
  assert.match(email, /preparo do turno levou/, 'sem registro da duração');
  assert.doesNotMatch(email, /echo[^\n]*(GMAIL_CHAT_PASS|TELEGRAM_BOT_TOKEN)/, 'a etapa de duração não pode ecoar segredo');
});

ok('o cache não guarda caixa, log de mensagem ou credencial', () => {
  const caminhos = [...email.matchAll(/path: ([^\n]+)/g)].map((m) => m[1].trim());
  for (const caminho of caminhos) {
    assert(!/email-log|GMAIL|secrets|\.git\b/.test(caminho), 'cache não pode incluir ' + caminho);
  }
});

ok('o leitor continua sendo o mesmo processo que atende a caixa', () => {
  assert.match(email, /node tools\/email-poll\.js/, 'chamada do leitor mudou');
  assert.match(email, /timeout-minutes: 350/, 'prazo do turno não pode cair sem decisão própria de cadência');
});

console.log('\n' + (falhas ? '✘ ' : '✔ ') + certos + '/' + (certos + falhas) + ' testes do cache do turno passaram');
process.exitCode = falhas ? 1 : 0;
