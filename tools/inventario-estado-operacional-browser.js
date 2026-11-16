// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 inventario-estado-operacional — versão browser (expondo __ieo_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function(){
  const STORAGE_KEY = 'rebocl_inventario-estado-operacional';
  
  function ler() {
    try {
      const b = localStorage.getItem(STORAGE_KEY);
      return b ? JSON.parse(b) : { itens: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    } catch (e) { return { itens: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() }; }
  }
  function gravar(d) {
    try { d.atualizadoEm = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {}
  }

  // __ieo_listar() -> lista todos os itens
  window.__ieo_listar = function() { return ler().itens; };

  // __ieo_adicionar(obj) -> adiciona um item
  window.__ieo_adicionar = function(obj) {
    const d = ler();
    const item = Object.assign({ id: d.proximoId++, criadoEm: new Date().toISOString() }, obj || {});
    d.itens.push(item);
    gravar(d);
    return { ok: true, inventario_estado_operacional: item };
  };

  // __ieo_estatisticas() -> contagem simples
  window.__ieo_estatisticas = function() {
    const d = ler();
    return { total: d.itens.length, atualizadoEm: d.atualizadoEm };
  };

  // __ieo_limpar() -> remove todos
  window.__ieo_limpar = function() {
    localStorage.removeItem(STORAGE_KEY);
    return { ok: true };
  };
})();
