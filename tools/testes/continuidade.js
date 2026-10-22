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
let governanca = '';
let centralOperacional = '';
let operacaoIncidentes = '';
let retencao = '';
let portabilidade = '';
let templatePr = '';
try { continuidade = ler('CONTINUIDADE.md'); } catch (e) { testa('CONTINUIDADE.md existe', false, e.message); }
try { autonomia = ler('AUTONOMIA.md'); } catch (e) { testa('AUTONOMIA.md existe', false, e.message); }
try { agentes = ler('AGENTS.md'); } catch (e) { testa('AGENTS.md existe', false, e.message); }
try { readme = ler('README.md'); } catch (e) { testa('README.md existe', false, e.message); }
try { workflowRapido = ler('.github/workflows/testes-rapidos.yml'); } catch (e) { testa('workflow de testes rápidos existe', false, e.message); }
try { governanca = ler('GOVERNANCA-CHAT-PRIMEIRO.md'); } catch (e) { testa('governança Chat primeiro existe', false, e.message); }
try { centralOperacional = ler('OPERACAO-CENTRAL.md'); } catch (e) { testa('contrato da Central existe', false, e.message); }
try { operacaoIncidentes = ler('OPERACAO-INCIDENTES.md'); } catch (e) { testa('manual de incidentes existe', false, e.message); }
try { retencao = ler('POLITICA-RETENCAO-OPERACIONAL.md'); } catch (e) { testa('política de retenção existe', false, e.message); }
try { portabilidade = ler('PORTABILIDADE-ESTATICA.md'); } catch (e) { testa('contrato de portabilidade existe', false, e.message); }
try { templatePr = ler('.github/PULL_REQUEST_TEMPLATE.md'); } catch (e) { testa('template de revisão humana existe', false, e.message); }

testa('continuidade declara a regra permanente', /## 0\. Regra permanente de continuidade/.test(continuidade) && /mesma série de commits/.test(continuidade));
testa('continuidade mapeia segurança, testes e checklist', /## 3\. Segurança que não pode regredir/.test(continuidade) && /## 5\. Testes e validação mínima/.test(continuidade) && /## 7\. Checklist obrigatório/.test(continuidade));
testa('instruções para agentes exigem atualização da continuidade', /CONTINUIDADE\.md/.test(agentes) && /mesmo conjunto de commits/.test(agentes));
testa('README aponta a continuidade', /\[[^\]]*CONTINUIDADE\.md[^\]]*\]\(CONTINUIDADE\.md\)/.test(readme));
testa('governança fixa Chat primeiro é verificável', /trabalhador principal/.test(governanca) && /agente externo/.test(governanca) && /Chat primeiro/.test(agentes) && /Chat primeiro/.test(continuidade));
testa('sinal de continuidade preserva corte seguro e sem execução entre mensagens', /continue trabalhando/.test(governanca) && /corte pequeno, seguro e reversível/.test(governanca) && /não autoriza trabalho em segundo plano entre mensagens/.test(governanca) && /Sinal de continuidade/.test(continuidade));
testa('política de autonomia entra na barreira', /R\$ 0/.test(autonomia) && /'AUTONOMIA\.md'/.test(workflowRapido));
testa('Central segura entra na continuidade e na barreira', /Central segura em etapas/.test(centralOperacional) && /'OPERACAO-CENTRAL\.md'/.test(workflowRapido) && /Central segura em etapas/.test(continuidade));
testa('estado da única prova real da Central não apaga os limites das demais receitas', /execução real[^\n]*!testarchat|!testarchat[^\n]*execução real/.test(centralOperacional) && /Não houve dispatch real de `!prepararchat`, `!dossiechat` ou `!reforcardossie`/.test(centralOperacional) && /!testarchat/.test(continuidade) && /!reforcardossie/.test(continuidade));
testa('dossiê 2B tem limites, rollback e barreira documentados', /!dossiechat/.test(centralOperacional) && /central\/dossie-preparo-/.test(centralOperacional) && /Revisão humana obrigatória|revisão humana/.test(centralOperacional) && /Rollback/.test(centralOperacional) && /!dossiechat/.test(autonomia) && /!dossiechat/.test(continuidade) && /tools\/dossie-preparo-controlado\.js/.test(workflowRapido));
testa('reforço 3A mantém catálogo literal, revisão e rollback documentados', /!reforcardossie/.test(centralOperacional) && /reforco_dossie_escopo_v1/.test(centralOperacional) && /central\/reforco-dossie-/.test(centralOperacional) && /três caminhos literais/.test(centralOperacional) && /!reforcardossie/.test(autonomia) && /!reforcardossie/.test(continuidade) && /!reforcardossie/.test(agentes) && /!reforcardossie/.test(readme) && /tools\/reforco-dossie-controlado\.js/.test(workflowRapido));
testa('barreira observa todo JavaScript/Python/Shell em tools', /'tools\/\*\*\/\*\.js'/.test(workflowRapido) && /'tools\/\*\*\/\*\.py'/.test(workflowRapido) && /'tools\/\*\*\/\*\.sh'/.test(workflowRapido));
testa('inventário, portabilidade e operação entram no corredor e na sintaxe', /tools\/inventario-estado-operacional\.js/.test(workflowRapido) && /inventario-estado-operacional\.js/.test(ler('tools/testes/roda-testes.js')) && /portabilidade-estatica\.js/.test(ler('tools/testes/roda-testes.js')) && /operacao-incidentes\.js/.test(ler('tools/testes/roda-testes.js')));
testa('incidente duplicado não autoriza cancelamento ou retry', /turnos-duplicados/.test(operacaoIncidentes) && /não cancelar nenhum/.test(operacaoIncidentes) && /não reexecutar às cegas/.test(operacaoIncidentes));
testa('retenção mede metadados e preserva sem expurgo', /metadados-git-locais/.test(ler('tools/inventario-estado-operacional.js')) && /Não há expurgo, arquivamento externo ou exclusão automática/.test(retencao) && /preservar e não apagar/.test(retencao));
testa('portabilidade declara somente a casca local e same-origin', /casca pública/.test(portabilidade) && /não é transferido automaticamente/.test(portabilidade) && /service worker/.test(portabilidade));
testa('template operacional exige revisão humana sem CODEOWNERS inventado', /revisor humano real/.test(templatePr) && /não inventar `CODEOWNERS` ou identidades/.test(templatePr) && /Não há auto-merge, bypass/.test(templatePr));
testa('documentos novos não trazem padrão de PAT', !/github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}/.test(continuidade + autonomia + agentes + governanca + centralOperacional + operacaoIncidentes + retencao + portabilidade + templatePr));

function arquivoOperacional(arquivo) {
  return /^\.github\/workflows\//.test(arquivo) ||
    /^tools\/.*\.(?:js|py|sh)$/.test(arquivo) ||
    /^(?:index|direto|ligar|limpar|console|motor(?:02|03|04)?)\.html$/.test(arquivo) ||
    /^(?:chat-estilos\.css|chat-pwa\.js|chat-comandos-locais\.js|chat-filtro-chips\.js|chat-organizacao-local\.js|chat-colecoes-local\.js|chat-workspace\.js|sw\.js|manifest\.json|dna\.json|AUTONOMIA\.md|OPERACAO-CENTRAL\.md|OPERACAO-INCIDENTES\.md|POLITICA-RETENCAO-OPERACIONAL\.md|PORTABILIDADE-ESTATICA\.md|AVALIACAO-HUMANA-PILOTO\.md|GOVERNANCA-CHAT-PRIMEIRO\.md|\.github\/PULL_REQUEST_TEMPLATE\.md)$/.test(arquivo);
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
