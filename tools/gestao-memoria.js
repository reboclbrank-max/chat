// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧠 INTERFACE DE GESTÃO DE MEMÓRIA
// Ver, editar, excluir e exportar o que o chat lembra.
// Só serve marketing de Prancheta e Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) {
  fs.mkdirSync(MARKETING_DIR, { recursive: true });
}

const ARQUIVO_MEMORIA_EXPORT = path.join(MARKETING_DIR, 'memoria-export.json');

function exportarMemoria() {
  const memoria = {};
  const chaves = [
    'assistente_rebocl_inteligencia_memoria_v1',
    'assistente_rebocl_campanhas_v1',
    'assistente_rebocl_agenda_v1',
    'assistente_rebocl_alertas_v1',
    'assistente_rebocl_recuperacao_v1',
    'assistente_rebocl_aprovacao_v1',
    'assistente_rebocl_semantico_cache_v1',
    'assistente_rebocl_feedback_v1',
  ];
  for (const chave of chaves) {
    try {
      const valor = localStorageGetItem(chave);
      if (valor) memoria[chave] = JSON.parse(valor);
    } catch (e) {}
  }
  const exportacao = {
    exportadoEm: new Date().toISOString(),
    versoes: Object.keys(memoria),
    dados: memoria,
  };
  try {
    fs.writeFileSync(ARQUIVO_MEMORIA_EXPORT, JSON.stringify(exportacao, null, 2), 'utf8');
  } catch (e) {}
  return exportacao;
}

// localStorage não existe no Node — esta função é apenas para o lado servidor
// no navegador, a exportação é feita via localStorage diretamente
function localStorageGetItem(chave) {
  return null; // servidor não tem localStorage
}

function estatisticasMemoria() {
  const chaves = [
    'assistente_rebocl_inteligencia_memoria_v1',
    'assistente_rebocl_campanhas_v1',
    'assistente_rebocl_agenda_v1',
    'assistente_rebocl_alertas_v1',
    'assistente_rebocl_recuperacao_v1',
    'assistente_rebocl_aprovacao_v1',
  ];
  const stats = {};
  let totalItens = 0;
  for (const chave of chaves) {
    try {
      const valor = localStorageGetItem(chave);
      if (valor) {
        const obj = JSON.parse(valor);
        let itens = 0;
        if (Array.isArray(obj)) itens = obj.length;
        else if (obj && typeof obj === 'object') {
          itens = Object.keys(obj).length;
        }
        stats[chave] = { itens, tamanho: valor.length };
        totalItens += itens;
      } else {
        stats[chave] = { itens: 0, tamanho: 0 };
      }
    } catch (e) {
      stats[chave] = { itens: 0, tamanho: 0, erro: e.message };
    }
  }
  return { totalItens, stats, exportadoEm: new Date().toISOString() };
}

module.exports = {
  exportarMemoria,
  estatisticasMemoria,
  ARQUIVO_MEMORIA_EXPORT,
};