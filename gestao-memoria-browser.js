// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧠 GESTÃO DE MEMÓRIA — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function (global) {
  'use strict';

  const CHAVES = [
    'assistente_rebocl_inteligencia_memoria_v1',
    'assistente_rebocl_campanhas_v1',
    'assistente_rebocl_agenda_v1',
    'assistente_rebocl_alertas_v1',
    'assistente_rebocl_recuperacao_v1',
    'assistente_rebocl_aprovacao_v1',
    'assistente_rebocl_semantico_cache_v1',
    'assistente_rebocl_feedback_v1',
  ];

  window.__mem_listarChaves = function () {
    const resultado = [];
    let totalItens = 0;
    for (const chave of CHAVES) {
      try {
        const valor = localStorage.getItem(chave);
        if (valor) {
          const obj = JSON.parse(valor);
          let itens = 0;
          if (Array.isArray(obj)) itens = obj.length;
          else if (obj && typeof obj === 'object') itens = Object.keys(obj).length;
          resultado.push({ chave, itens, tamanho: valor.length });
          totalItens += itens;
        } else {
          resultado.push({ chave, itens: 0, tamanho: 0 });
        }
      } catch (e) {
        resultado.push({ chave, itens: 0, tamanho: 0, erro: e.message });
      }
    }
    return { chaves: resultado, totalItens };
  };

  window.__mem_obterChave = function (chave) {
    try {
      const valor = localStorage.getItem(chave);
      if (!valor) return { ok: false, erro: 'Chave não encontrada' };
      return { ok: true, chave, dados: JSON.parse(valor) };
    } catch (e) {
      return { ok: false, erro: e.message };
    }
  };

  window.__mem_editarChave = function (chave, novosDados) {
    try {
      localStorage.setItem(chave, JSON.stringify(novosDados, null, 2));
      return { ok: true, chave };
    } catch (e) {
      return { ok: false, erro: e.message };
    }
  };

  window.__mem_excluirChave = function (chave) {
    try {
      const existia = localStorage.getItem(chave) !== null;
      localStorage.removeItem(chave);
      return { ok: true, chave, existia };
    } catch (e) {
      return { ok: false, erro: e.message };
    }
  };

  window.__mem_exportar = function () {
    const memoria = {};
    for (const chave of CHAVES) {
      try {
        const valor = localStorage.getItem(chave);
        if (valor) memoria[chave] = JSON.parse(valor);
      } catch (e) {}
    }
    const exportacao = {
      exportadoEm: new Date().toISOString(),
      versoes: Object.keys(memoria),
      dados: memoria,
    };
    return exportacao;
  };

  window.__mem_importar = function (dadosImportados) {
    try {
      const dados = typeof dadosImportados === 'string' ? JSON.parse(dadosImportados) : dadosImportados;
      const chavesImportadas = [];
      if (dados.dados) {
        for (const [chave, valor] of Object.entries(dados.dados)) {
          localStorage.setItem(chave, JSON.stringify(valor));
          chavesImportadas.push(chave);
        }
      }
      return { ok: true, chavesImportadas };
    } catch (e) {
      return { ok: false, erro: e.message };
    }
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);