// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 gestao-memoria — versão browser (expondo __gm_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function(){
  const STORAGE_KEY = 'rebocl_gestao-memoria';
  
  function ler() {
    try {
      const b = localStorage.getItem(STORAGE_KEY);
      return b ? JSON.parse(b) : { itens: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    } catch (e) { return { itens: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() }; }
  }
  function gravar(d) {
    try { d.atualizadoEm = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {}
  }

  // __gm_listar() -> lista todos os itens
  window.__gm_listar = function() { return ler().itens; };

  // __gm_adicionar(obj) -> adiciona um item
  window.__gm_adicionar = function(obj) {
    const d = ler();
    const item = Object.assign({ id: d.proximoId++, criadoEm: new Date().toISOString() }, obj || {});
    d.itens.push(item);
    gravar(d);
    return { ok: true, gestao_memoria: item };
  };

  // __gm_estatisticas() -> contagem simples
  window.__gm_estatisticas = function() {
    const d = ler();
    return { total: d.itens.length, atualizadoEm: d.atualizadoEm };
  };

  // __gm_limpar() -> remove todos
  window.__gm_limpar = function() {
    localStorage.removeItem(STORAGE_KEY);
    return { ok: true };
  };
})();
