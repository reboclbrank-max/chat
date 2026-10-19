// Garante que o mapa de continuidade continue presente e acompanhe mudanças operacionais.
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
let total = 0;
let falhas = 0;
function testa(nome, ok, detalhe = '') {
  total++;
  if (!ok) falhas++;
  console.log((ok ? '✔ ' : '✘ ') + nome + (ok ? '' : ' → ' + detalhe));
}
function ler(relativo) {
  return fs.readFileSync(path.join(RAIZ, relativo), 'utf8');
}

let continuidade = '';
let autonomia = '';
let agentes = '';
let readme = '';
let workflowRapido = '';
try { continuidade = ler('CONTINUIDADE.md'); } catch (e) { testa('CONTINUIDADE.md existe', false, e.message); }
try { autonomia = ler('AUTONOMIA.md'); } catch (e) { testa('AUTONOMIA.md existe', false, e.message); }
try { agentes = ler('AGENTS.md'); } catch (e) { testa('AGENTS.md existe', false, e.message); }
try { readme = ler('README.md'); } catch (e) { testa('README.md existe', false, e.message); }
try { workflowRapido = ler('.github/workflows/testes-rapidos.yml'); } catch (e) { testa('workflow de testes rápidos existe', false, e.message); }

testa('continuidade declara a regra permanente', /## 0\. Regra permanente de continuidade/.test(continuidade) && /mesma série de commits/.test(continuidade));
testa('continuidade mapeia segurança, testes e checklist', /## 3\. Segurança que não pode regredir/.test(continuidade) && /## 5\. Testes e validação mínima/.test(continuidade) && /## 7\. Checklist obrigatório/.test(continuidade));
testa('instruções para agentes exigem atualização da continuidade', /CONTINUIDADE\.md/.test(agentes) && /mesmo conjunto de commits/.test(agentes));
testa('README aponta a continuidade', /\[[^\]]*CONTINUIDADE\.md[^\]]*\]\(CONTINUIDADE\.md\)/.test(readme));
testa('política de autonomia entra na barreira', /R\$ 0/.test(autonomia) && /'AUTONOMIA\.md'/.test(workflowRapido));
testa('barreira observa todo JavaScript/Python/Shell em tools', /'tools\/\*\*\/\*\.js'/.test(workflowRapido) && /'tools\/\*\*\/\*\.py'/.test(workflowRapido) && /'tools\/\*\*\/\*\.sh'/.test(workflowRapido));
testa('documentos novos não trazem padrão de PAT', !/github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}/.test(continuidade + autonomia + agentes));

function arquivoOperacional(arquivo) {
  return /^\.github\/workflows\//.test(arquivo) ||
    /^tools\/.*\.(?:js|py|sh)$/.test(arquivo) ||
    /^(?:index|direto|ligar|limpar|console|motor(?:02|03|04)?)\.html$/.test(arquivo) ||
    /^(?:chat-estilos\.css|chat-pwa\.js|sw\.js|manifest\.json|dna\.json|AUTONOMIA\.md)$/.test(arquivo);
}

const evento = process.env.GITHUB_EVENT_PATH;
if (evento && fs.existsSync(evento)) {
  try {
    const dados = JSON.parse(fs.readFileSync(evento, 'utf8'));
    const alterados = new Set();
    for (const commit of dados.commits || []) {
      for (const tipo of ['added', 'modified', 'removed']) {
        for (const arquivo of commit[tipo] || []) alterados.add(arquivo);
      }
    }
    const houveMudancaOperacional = [...alterados].some(arquivoOperacional);
    const continuidadeFoiAtualizada = alterados.has('CONTINUIDADE.md');
    testa('push operacional atualiza CONTINUIDADE.md', !houveMudancaOperacional || continuidadeFoiAtualizada,
      'houve código/workflow sem atualização do retrato de continuidade');
  } catch (e) {
    testa('evento de push pode ser lido', false, e.message);
  }
} else {
  console.log('ℹ porta de push não avaliada fora do GitHub Actions');
}

console.log(`${total - falhas}/${total} verificações de continuidade passaram`);
process.exitCode = falhas ? 1 : 0;
