// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 sistema-recompensas-engajamento — versão browser (expondo __sre_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function(){
  const STORAGE_KEY = 'rebocl_sistema-recompensas-engajamento';
  
  function ler() {
    try {
      const b = localStorage.getItem(STORAGE_KEY);
      return b ? JSON.parse(b) : { itens: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    } catch (e) { return { itens: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() }; }
  }
  function gravar(d) {
    try { d.atualizadoEm = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {}
  }

  // __sre_listar() -> lista todos os itens
  window.__sre_listar = function() { return ler().itens; };

  // __sre_adicionar(obj) -> adiciona um item
  window.__sre_adicionar = function(obj) {
    const d = ler();
    const item = Object.assign({ id: d.proximoId++, criadoEm: new Date().toISOString() }, obj || {});
    d.itens.push(item);
    gravar(d);
    return { ok: true, sistema_recompensas_engajamento: item };
  };

  // __sre_estatisticas() -> contagem simples
  window.__sre_estatisticas = function() {
    const d = ler();
    return { total: d.itens.length, atualizadoEm: d.atualizadoEm };
  };

  // __sre_limpar() -> remove todos
  window.__sre_limpar = function() {
    localStorage.removeItem(STORAGE_KEY);
    return { ok: true };
  };
})();
