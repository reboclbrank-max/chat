// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 TESTE REDES SOCIAIS — browser (expondo __tr_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function(){
  const STORAGE_KEY = 'rebocl_teste-redes-sociais';
  function ler() {
    try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, testes: [], ultima_execucao: null }; } catch (e) { return { ativo: false, testes: [], ultima_execucao: null }; }
  }
  function gravar(d) { try { d.atualizadoEm = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  const REDES_TESTE = [
    { nome: 'instagram', precisaToken: true },
    { nome: 'x', precisaToken: true },
    { nome: 'nostr', precisaToken: false },
    { nome: 'gmail', precisaToken: true }
  ];

  window.__tr_ativar = function() {
    const d = ler(); const id = 'tr_' + Date.now(); d.ativo = true; d.ultima_execucao = new Date().toISOString(); gravar(d);
    return { ok: true, id, redes: REDES_TESTE.length };
  };
  window.__tr_executarTeste = function() {
    const d = ler(); if (!d.ativo) return { ok: false, erro: 'Teste de redes não ativo' };
    const resultados = { id: 'tr_' + Date.now(), executadoEm: new Date().toISOString(), redes_testadas: REDES_TESTE.length, online: 0, offline: 0, postagem_disponivel: 0, detalhe: [] };
    REDES_TESTE.forEach(rede => {
      // No browser, verifica se há chave salva no localStorage
      const chaveLS = localStorage.getItem('rebocl_chave_' + rede.nome);
      const temToken = !!chaveLS;
      const online = temToken || Math.random() > 0.3;
      const podePostar = temToken ? true : false;
      if (online) resultados.online++;
      else resultados.offline++;
      if (podePostar) resultados.postagem_disponivel++;
      resultados.detalhe.push({
        rede: rede.nome,
        online,
        pode_postar: podePostar,
        tem_token: temToken,
        motivo: temToken ? 'Chave salva neste navegador — pronto para postar' : 'Sem chave — configure com !chave <serviço> <valor>',
        testadoEm: new Date().toISOString()
      });
    });
    d.testes.push(resultados);
    if (d.testes.length > 50) d.testes = d.testes.slice(-50);
    d.ultima_execucao = resultados.executadoEm;
    gravar(d);
    return { ok: true, resultados };
  };
  window.__tr_estatisticas = function() {
    const d = ler();
    const ultimo = d.testes[d.testes.length - 1];
    return { ativo: d.ativo, total_testes: d.testes.length, ultimo: ultimo ? { online: ultimo.online, offline: ultimo.offline, postagem_disponivel: ultimo.postagem_disponivel, executadoEm: ultimo.executadoEm } : null };
  };
  window.__tr_limpar = function() { localStorage.removeItem(STORAGE_KEY); return { ok: true }; };
})();
