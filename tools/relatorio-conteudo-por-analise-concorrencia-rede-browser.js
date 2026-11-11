// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 relatorio-conteudo-por-analise-concorrencia-rede — versão browser (expondo __rcpacr_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function(){
  const STORAGE_KEY = 'rebocl_relatorio-conteudo-por-analise-concorrencia-rede';
  
  function ler() {
    try {
      const b = localStorage.getItem(STORAGE_KEY);
      return b ? JSON.parse(b) : { itens: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    } catch (e) { return { itens: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() }; }
  }
  function gravar(d) {
    try { d.atualizadoEm = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {}
  }

  // __rcpacr_listar() -> lista todos os itens
  window.__rcpacr_listar = function() { return ler().itens; };

  // __rcpacr_adicionar(obj) -> adiciona um item
  window.__rcpacr_adicionar = function(obj) {
    const d = ler();
    const item = Object.assign({ id: d.proximoId++, criadoEm: new Date().toISOString() }, obj || {});
    d.itens.push(item);
    gravar(d);
    return { ok: true, relatorio_conteudo_por_analise_concorrencia_rede: item };
  };

  // __rcpacr_estatisticas() -> contagem simples
  window.__rcpacr_estatisticas = function() {
    const d = ler();
    return { total: d.itens.length, atualizadoEm: d.atualizadoEm };
  };

  // __rcpacr_limpar() -> remove todos
  window.__rcpacr_limpar = function() {
    localStorage.removeItem(STORAGE_KEY);
    return { ok: true };
  };
})();
