// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 relatorio-conteudo-por-fuso-horario — versão browser (expondo __rcpfh_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function(){
  const STORAGE_KEY = 'rebocl_relatorio-conteudo-por-fuso-horario';
  
  function ler() {
    try {
      const b = localStorage.getItem(STORAGE_KEY);
      return b ? JSON.parse(b) : { itens: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    } catch (e) { return { itens: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() }; }
  }
  function gravar(d) {
    try { d.atualizadoEm = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {}
  }

  // __rcpfh_listar() -> lista todos os itens
  window.__rcpfh_listar = function() { return ler().itens; };

  // __rcpfh_adicionar(obj) -> adiciona um item
  window.__rcpfh_adicionar = function(obj) {
    const d = ler();
    const item = Object.assign({ id: d.proximoId++, criadoEm: new Date().toISOString() }, obj || {});
    d.itens.push(item);
    gravar(d);
    return { ok: true, relatorio_conteudo_por_fuso_horario: item };
  };

  // __rcpfh_estatisticas() -> contagem simples
  window.__rcpfh_estatisticas = function() {
    const d = ler();
    return { total: d.itens.length, atualizadoEm: d.atualizadoEm };
  };

  // __rcpfh_limpar() -> remove todos
  window.__rcpfh_limpar = function() {
    localStorage.removeItem(STORAGE_KEY);
    return { ok: true };
  };
})();
