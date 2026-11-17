// MAPA DE COBERTURA — gera tools/testes/mapa-cobertura.json
// Para cada arquivo em tools/testes/*.js: módulos requeridos, módulos lidos
// estaticamente, invariantes afirmadas (nomes de testa/ok/confere) e tipo.
// Método: análise estática por require/readFileSync, não por palpite.
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const DIR_TESTES = path.join(RAIZ, 'tools', 'testes');
const SAIDA = path.join(DIR_TESTES, 'mapa-cobertura.json');

function classificaSuite(fonte) {
  const executaModulo = /require\(\s*['"]\.\.\/(?!testes)/.test(fonte) ||
    /vm\.runInContext/.test(fonte) ||
    /spawnSync\(\s*['"]node['"]\s*,\s*\[\s*[^\]]*CHAT/.test(fonte) ||
    /spawnSync\(\s*['"]python3['"]/.test(fonte) ||
    /require\(process\.argv\[2\]\)/.test(fonte) ||
    /execFileSync\(process\.execPath/.test(fonte);
  const leArquivo = /readFileSync|existsSync/.test(fonte);
  if (executaModulo && leArquivo) return 'misto';
  if (executaModulo) return 'comportamento';
  return leArquivo ? 'estatica' : 'misto';
}

function extraiModulos(fonte, arquivoTeste) {
  const modulos = new Set();
  const lidos = new Set();

  // require('...') com caminho relativo ou absoluto via path.resolve/join
  const reRequire = /require\(\s*(?:path\.(?:resolve|join)\([^)]*\)|['"]([^'"]+)['"])\s*\)/g;
  let m;
  while ((m = reRequire.exec(fonte)) !== null) {
    const arg = m[1];
    if (!arg) continue; // path.resolve/join sem literal simples — tenta extrair string dentro
    if (arg.startsWith('.') || arg.startsWith('/')) {
      // resolve relativo ao diretório do teste
      const dirTeste = path.dirname(arquivoTeste);
      const abs = path.resolve(dirTeste, arg);
      const rel = path.relative(RAIZ, abs);
      if (!rel.startsWith('..') && !rel.startsWith('tools/testes/')) modulos.add(rel);
    } else if (!['path', 'fs', 'assert', 'child_process', 'os', 'module', 'crypto', 'http', 'https', 'url', 'util', 'vm', 'stream', 'events', 'buffer', 'querystring', 'zlib'].includes(arg)) {
      // dependência externa (imapflow, nodemailer, etc.) — registra como externa
      modulos.add('externo:' + arg);
    }
  }
  // require(path.resolve(__dirname, '..', '..', 'roteador-ia.js')) — extrai o último literal
  const reResolve = /require\(\s*path\.resolve\([^)]*['"]([^'"]+\.js)['"]\s*\)/g;
  while ((m = reResolve.exec(fonte)) !== null) {
    const nome = m[1];
    // tenta resolver: procura o arquivo no repo
    const candidatos = [
      path.join(RAIZ, nome),
      path.join(RAIZ, 'tools', nome),
      path.join(RAIZ, 'tools', 'testes', nome),
    ];
    for (const c of candidatos) {
      if (fs.existsSync(c)) {
        const rel = path.relative(RAIZ, c);
        if (!rel.startsWith('tools/testes/')) modulos.add(rel);
        break;
      }
    }
    // se não achou, registra o nome cru
    if (![...modulos].some(x => x.endsWith(nome))) modulos.add(nome);
  }
  // require(process.argv[2]) — o CHAT (tools/email-chat.js)
  if (/require\(process\.argv\[2\]\)/.test(fonte)) modulos.add('tools/email-chat.js');
  // execFileSync com tools/auto-melhoria.js etc.
  const reExec = /execFileSync\(process\.execPath,\s*\[path\.join\(RAIZ,\s*'([^']+)'\)/g;
  while ((m = reExec.exec(fonte)) !== null) modulos.add(m[1]);
  const reExec2 = /path\.join\(RAIZ,\s*'tools',\s*'([^']+)'\)/g;
  while ((m = reExec2.exec(fonte)) !== null) {
    const rel = 'tools/' + m[1];
    if (!rel.startsWith('tools/testes/')) modulos.add(rel);
  }
  // vm.runInContext com arquivo lido
  const reVm = /readFileSync\(path\.join\(raiz,\s*'([^']+)'\)/g;
  while ((m = reVm.exec(fonte)) !== null) {
    const rel = m[1];
    if (!rel.startsWith('tools/testes/') && rel.endsWith('.js')) modulos.add(rel);
    else if (rel.endsWith('.js')) lidos.add(rel);
  }
  // readFileSync genérico: captura paths lidos estaticamente (js, html, json, yml...)
  const reRead = /readFileSync\(path\.join\(raiz,\s*'([^']+)'\)/g;
  while ((m = reRead.exec(fonte)) !== null) {
    const rel = m[1];
    if (!rel.startsWith('tools/testes/')) lidos.add(rel);
  }
  const reRead2 = /ler\(['"]([^'"]+)['"]\)/g;
  while ((m = reRead2.exec(fonte)) !== null) {
    const rel = m[1];
    if (!rel.startsWith('tools/testes/')) lidos.add(rel);
  }
  // path.join(RAIZ, 'index.html') e variantes
  const reRead3 = /path\.join\(RAIZ,\s*'([^']+)'\)/g;
  while ((m = reRead3.exec(fonte)) !== null) {
    const rel = m[1];
    if (!rel.startsWith('tools/testes/') && /\.(js|html|json|yml|css)$/.test(rel)) lidos.add(rel);
  }
  return { modulos: [...modulos].sort(), lidos: [...lidos].sort() };
}

function extraiInvariantes(fonte) {
  const inv = [];
  // testa('nome', ...), ok('nome', ...), confere('nome', ...)
  const re = /(?:testa|ok|confere)\(\s*['"]([^'"]{5,120})['"]/g;
  let m;
  while ((m = re.exec(fonte)) !== null) inv.push(m[1]);
  // assert com mensagem também é invariante, mas os nomes acima bastam
  return inv.slice(0, 30); // limita para não explodir o JSON
}

// Normaliza caminhos: `../email-chat.js` visto de tools/testes é `tools/email-chat.js`.
// Sem isso o mutador procura o módulo como se ele não existisse (falso "AUSENTE").
function normalizaCaminho(m) {
  if (m.startsWith('externo:')) return m;
  if (fs.existsSync(path.join(RAIZ, m))) return m;
  const alt = path.relative(RAIZ, path.resolve(DIR_TESTES, m));
  if (!alt.startsWith('..') && fs.existsSync(path.join(RAIZ, alt))) return alt;
  return m;
}

function main() {
  // Exclui as ferramentas do próprio ciclo (gerar-mapa, mutador) — o mapa cobre os 135 originais.
  // ferramentas do ciclo 2 não são testes — ficam fora do mapa (que cobre os 135 do repo)
  const EXCLUIR = new Set(['gerar-mapa.js', 'mutador.js', 'medir-tempos.js']);
  const arquivos = fs.readdirSync(DIR_TESTES).filter(f => f.endsWith('.js') && !EXCLUIR.has(f)).sort();
  const mapa = {};
  let semModulo = 0;

  for (const arq of arquivos) {
    const completo = path.join(DIR_TESTES, arq);
    const fonte = fs.readFileSync(completo, 'utf8');
    const { modulos, lidos } = extraiModulos(fonte, completo);
    const invariantes = extraiInvariantes(fonte);
    const tipo = classificaSuite(fonte);
    const requeridos = [...new Set(modulos.map(normalizaCaminho))].sort();
    const lidosNorm = [...new Set(lidos.map(normalizaCaminho))].sort();

    // Helpers (roda-testes, pre-requisitos, cdp, simula-caixa) não são testes
    const ehHelper = ['roda-testes.js', 'pre-requisitos.js', 'cdp.js', 'simula-caixa.js'].includes(arq);
    if (requeridos.length === 0 && lidosNorm.length === 0 && !ehHelper) semModulo++;

    mapa[arq] = {
      arquivo: 'tools/testes/' + arq,
      tipo,
      ehHelper,
      modulosRequeridos: requeridos,
      modulosLidosEstaticamente: lidosNorm,
      invariantes: invariantes,
      totalInvariantes: invariantes.length,
    };
  }

  const resumo = {
    geradoEm: new Date().toISOString(),
    totalArquivos: arquivos.length,
    semModuloMapeado: semModulo,
    porTipo: {
      comportamento: Object.values(mapa).filter(v => v.tipo === 'comportamento').length,
      misto: Object.values(mapa).filter(v => v.tipo === 'misto').length,
      estatica: Object.values(mapa).filter(v => v.tipo === 'estatica').length,
    },
  };

  const saida = { resumo, testes: mapa };
  fs.writeFileSync(SAIDA, JSON.stringify(saida, null, 2) + '\n');
  console.log('mapa-cobertura.json: ' + arquivos.length + ' entradas, ' + semModulo + ' sem módulo mapeado');
  console.log('por tipo: ' + JSON.stringify(resumo.porTipo));
}

main();
