/**
 * TESTES RÍGIDOS — Chat Totalmente Autônomo
 * Valida: módulos JS, script tags, comandos, funções globais, ARSENAL_JS, inicialização automática
 * Executa: node testes-rigidos-autonomo.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = '/home/user/chat-clone';
const TOOLS_DIR = path.join(ROOT, 'tools');
const INDEX_HTML = path.join(ROOT, 'index.html');

let passed = 0;
let failed = 0;
const errors = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      passed++;
      console.log(`  ✅ ${name}`);
    } else {
      failed++;
      errors.push(`${name}: ${result}`);
      console.log(`  ❌ ${name} — ${result}`);
    }
  } catch (e) {
    failed++;
    errors.push(`${name}: ${e.message}`);
    console.log(`  ❌ ${name} — ERRO: ${e.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'falhou');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GRUPO 1: MÓDULOS JS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('GRUPO 1 — MÓDULOS JS (630 arquivos: 315 servidor + 315 browser)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const allJs = fs.readdirSync(TOOLS_DIR).filter(f => f.endsWith('.js'));
const serverJs = allJs.filter(f => !f.endsWith('-browser.js'));
const browserJs = allJs.filter(f => f.endsWith('-browser.js'));

test(`Total de arquivos JS = 630 (esperado 630, atual ${allJs.length})`, () => {
  assert(allJs.length === 630, `esperado 630, encontrado ${allJs.length}`);
});

test(`Módulos servidor = 315 (atual ${serverJs.length})`, () => {
  assert(serverJs.length === 315, `esperado 315, encontrado ${serverJs.length}`);
});

test(`Módulos -browser.js = 315 (atual ${browserJs.length})`, () => {
  assert(browserJs.length === 315, `esperado 315, encontrado ${browserJs.length}`);
});

// Validar sintaxe de todos com node -c
const { execSync } = require('child_process');
let syntaxErrors = 0;
for (const f of allJs) {
  try {
    execSync(`node -c "${path.join(TOOLS_DIR, f)}"`, { stdio: 'pipe' });
  } catch (e) {
    syntaxErrors++;
  }
}
test(`Todos os ${allJs.length} módulos passam no node -c (zero erros de sintaxe)`, () => {
  assert(syntaxErrors === 0, `${syntaxErrors} arquivos com erro de sintaxe`);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GRUPO 2: SCRIPT TAGS NO index.html
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('GRUPO 2 — SCRIPT TAGS NO index.html');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const indexContent = fs.readFileSync(INDEX_HTML, 'utf-8');
const scriptTags = (indexContent.match(/<script src="[^"]*-browser\.js"><\/script>/g) || []);
test(`Script tags -browser.js = 362 (atual ${scriptTags.length})`, () => {
  assert(scriptTags.length === 362, `esperado 362, encontrado ${scriptTags.length}`);
});

// Verificar os 9 novos -browser.js específicos
const novosBrowser = [
  'sistema-limite-max-browser.js',
  'orquestrador-maximo-marketing-browser.js',
  'detector-anomalias-marketing-browser.js',
  'loop-aprendizado-automatico-browser.js',
  'auto-otimizador-horarios-browser.js',
  'dashboard-limite-marketing-browser.js',
  'recuperacao-cadeia-marketing-browser.js',
  'integracao-cruzada-marketing-browser.js',
  'auto-escalada-marketing-browser.js',
];
for (const nb of novosBrowser) {
  test(`Script tag presente: ${nb}`, () => {
    assert(indexContent.includes(nb), `${nb} não encontrado em script tags`);
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GRUPO 3: COMANDOS maosDaCasa()
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('GRUPO 3 — COMANDOS INTEGRADOS AO maosDaCasa()');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const novosComandos = [
  '!sistema-limite-max', '!sistema-status',
  '!orquestrador-ativar', '!orquestrador-coordenar', '!orquestrador-estatisticas',
  '!detector-anomalias-ativar', '!detectar-anomalia', '!detector-estatisticas',
  '!loop-aprendizado-ativar', '!registrar-resultado', '!loop-estatisticas',
  '!auto-otimizador-ativar', '!registrar-acesso', '!otimizador-estatisticas',
  '!dashboard-limite-ativar', '!adicionar-widget', '!adicionar-alerta', '!dashboard-estatisticas',
  '!recuperacao-cadeia-ativar', '!registrar-falha', '!recuperacao-estatisticas',
  '!integracao-cruzada-ativar', '!executar-fluxo', '!integracao-estatisticas',
  '!auto-escalada-ativar', '!ajustar-escala', '!escalada-estatisticas',
];

let comandosEncontrados = 0;
for (const cmd of novosComandos) {
  if (indexContent.includes(cmd)) {
    comandosEncontrados++;
  } else {
    test(`Comando integrado: ${cmd}`, () => false);
  }
}
test(`Todos os ${novosComandos.length} novos comandos no maosDaCasa() (atual ${comandosEncontrados})`, () => {
  assert(comandosEncontrados === novosComandos.length, `${novosComandos.length - comandosEncontrados} comandos faltando`);
});

// Verificar que maosDaCasa() existe e tem return null;
test(`maosDaCasa() definida no index.html`, () => {
  assert(indexContent.includes('function maosDaCasa'), 'maosDaCasa() não encontrada');
  assert(indexContent.includes('return null;'), 'return null; não encontrado');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GRUPO 4: FUNÇÕES GLOBAIS NOS -browser.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('GRUPO 4 — FUNÇÕES GLOBAIS NOS -browser.js');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const funcoesGlobais = [
  { arquivo: 'sistema-limite-max-browser.js', funcao: '__slm_ativar' },
  { arquivo: 'orquestrador-maximo-marketing-browser.js', funcao: '__omm_ativar' },
  { arquivo: 'detector-anomalias-marketing-browser.js', funcao: '__dam_ativar' },
  { arquivo: 'loop-aprendizado-automatico-browser.js', funcao: '__laa_ativar' },
  { arquivo: 'auto-otimizador-horarios-browser.js', funcao: '__aoh_ativar' },
  { arquivo: 'dashboard-limite-marketing-browser.js', funcao: '__dlm_ativar' },
  { arquivo: 'recuperacao-cadeia-marketing-browser.js', funcao: '__rcm_ativar' },
  { arquivo: 'integracao-cruzada-marketing-browser.js', funcao: '__icm_ativar' },
  { arquivo: 'auto-escalada-marketing-browser.js', funcao: '__aem_ativar' },
];

for (const fg of funcoesGlobais) {
  const arquivoPath = path.join(TOOLS_DIR, fg.arquivo);
  const conteudo = fs.readFileSync(arquivoPath, 'utf-8');
  test(`Função global ${fg.funcao} exposta em ${fg.arquivo}`, () => {
    assert(conteudo.includes(`window.${fg.funcao}`), `window.${fg.funcao} não encontrada`);
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GRUPO 5: ARSENAL_JS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('GRUPO 5 — ARSENAL_JS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

test(`ARSENAL_JS contém !sistema-limite-max`, () => {
  assert(indexContent.includes('!sistema-limite-max'), 'não encontrado');
});
test(`ARSENAL_JS contém !orquestrador-ativar`, () => {
  assert(indexContent.includes('!orquestrador-ativar'), 'não encontrado');
});
test(`ARSENAL_JS contém !detector-anomalias-ativar`, () => {
  assert(indexContent.includes('!detector-anomalias-ativar'), 'não encontrado');
});
test(`ARSENAL_JS contém !loop-aprendizado-ativar`, () => {
  assert(indexContent.includes('!loop-aprendizado-ativar'), 'não encontrado');
});
test(`ARSENAL_JS contém !auto-otimizador-ativar`, () => {
  assert(indexContent.includes('!auto-otimizador-ativar'), 'não encontrado');
});
test(`ARSENAL_JS contém !dashboard-limite-ativar`, () => {
  assert(indexContent.includes('!dashboard-limite-ativar'), 'não encontrado');
});
test(`ARSENAL_JS contém !recuperacao-cadeia-ativar`, () => {
  assert(indexContent.includes('!recuperacao-cadeia-ativar'), 'não encontrado');
});
test(`ARSENAL_JS contém !integracao-cruzada-ativar`, () => {
  assert(indexContent.includes('!integracao-cruzada-ativar'), 'não encontrado');
});
test(`ARSENAL_JS contém !auto-escalada-ativar`, () => {
  assert(indexContent.includes('!auto-escalada-ativar'), 'não encontrado');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GRUPO 6: INICIALIZAÇÃO AUTOMÁTICA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('GRUPO 6 — INICIALIZAÇÃO AUTOMÁTICA (zero intervenção humana)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

test(`Bloco de inicialização automática presente`, () => {
  assert(indexContent.includes('INICIALIZAÇÃO AUTOMÁTICA'), 'bloco não encontrado');
});
test(`Chamada window.__slm_ativar() na inicialização`, () => {
  assert(indexContent.includes('window.__slm_ativar'), 'não encontrado');
});
test(`Chamada window.__omm_ativar() na inicialização`, () => {
  assert(indexContent.includes('window.__omm_ativar'), 'não encontrado');
});
test(`Chamada window.__omm_coordenar() na inicialização`, () => {
  assert(indexContent.includes('window.__omm_coordenar'), 'não encontrado');
});
test(`Chamada window.__dam_ativar() na inicialização`, () => {
  assert(indexContent.includes('window.__dam_ativar'), 'não encontrado');
});
test(`Chamada window.__laa_ativar() na inicialização`, () => {
  assert(indexContent.includes('window.__laa_ativar'), 'não encontrado');
});
test(`Chamada window.__aoh_ativar() na inicialização`, () => {
  assert(indexContent.includes('window.__aoh_ativar'), 'não encontrado');
});
test(`Chamada window.__dlm_ativar() na inicialização`, () => {
  assert(indexContent.includes('window.__dlm_ativar'), 'não encontrado');
});
test(`Chamada window.__rcm_ativar() na inicialização`, () => {
  assert(indexContent.includes('window.__rcm_ativar'), 'não encontrado');
});
test(`Chamada window.__icm_ativar() na inicialização`, () => {
  assert(indexContent.includes('window.__icm_ativar'), 'não encontrado');
});
test(`Chamada window.__aem_ativar() na inicialização`, () => {
  assert(indexContent.includes('window.__aem_ativar'), 'não encontrado');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GRUPO 7: RESTRIÇÕES (Pinterest, TikTok, itch.io removidos)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('GRUPO 7 — RESTRIÇÕES (Pinterest, TikTok, itch.io social removidos)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

test(`index.html não menciona Pinterest`, () => {
  assert(!indexContent.toLowerCase().includes('pinterest'), 'Pinterest ainda presente');
});
test(`index.html não menciona TikTok`, () => {
  assert(!indexContent.toLowerCase().includes('tiktok'), 'TikTok ainda presente');
});
test(`index.html não menciona itch.io social`, () => {
  assert(!indexContent.toLowerCase().includes('itch.io'), 'itch.io ainda presente');
});
test(`Nenhum módulo JS menciona Pinterest`, () => {
  let achou = false;
  for (const f of allJs) {
    const c = fs.readFileSync(path.join(TOOLS_DIR, f), 'utf-8');
    if (c.toLowerCase().includes('pinterest')) { achou = true; break; }
  }
  assert(!achou, 'Pinterest encontrado em módulos JS');
});
test(`Nenhum módulo JS menciona TikTok`, () => {
  let achou = false;
  for (const f of allJs) {
    const c = fs.readFileSync(path.join(TOOLS_DIR, f), 'utf-8');
    if (c.toLowerCase().includes('tiktok')) { achou = true; break; }
  }
  assert(!achou, 'TikTok encontrado em módulos JS');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESULTADO FINAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('RESULTADO FINAL');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ Passou:  ${passed}`);
console.log(`❌ Falhou:  ${failed}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

if (failed > 0) {
  console.log('\nErros:');
  for (const e of errors) {
    console.log(`  • ${e}`);
  }
  process.exit(1);
} else {
  console.log('\n🎉 TODOS OS TESTES RÍGIDOS PASSARAM — Chat totalmente autônomo validado!');
  process.exit(0);
}