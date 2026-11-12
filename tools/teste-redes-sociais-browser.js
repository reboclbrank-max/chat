// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 TESTE REDES SOCIAIS — browser (expondo __tr_*)
// Chamadas fetch reais para verificar conectividade com Instagram, X, Nostr, Gmail.
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function() {
  const STORAGE_KEY = 'rebocl_teste-redes-sociais';
  function ler() {
    try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, testes: [], ultima_execucao: null }; } catch (e) { return { ativo: false, testes: [], ultima_execucao: null }; }
  }
  function gravar(d) { try { d.atualizadoEm = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  const REDES_TESTE = [
    { nome: 'instagram', endpoint: 'https://graph.instagram.com/me', precisaToken: true },
    { nome: 'x', endpoint: 'https://api.twitter.com/2/users/me', precisaToken: true },
    { nome: 'nostr', endpoint: 'https://nostr.wine/', precisaToken: false },
    { nome: 'gmail', endpoint: 'https://gmail.googleapis.com/gmail/v1/users/me/profile', precisaToken: true }
  ];

  async function fetchComTimeout(url, timeoutMs = 15000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'rebocl-teste-redes/1.0' } });
      clearTimeout(t);
      return { ok: true, status: r.status };
    } catch (e) {
      clearTimeout(t);
      return { ok: false, erro: e.message.slice(0, 120) };
    }
  }

  window.__tr_ativar = function() {
    const d = ler(); const id = 'tr_' + Date.now(); d.ativo = true; d.ultima_execucao = new Date().toISOString(); gravar(d);
    return { ok: true, id, redes: REDES_TESTE.length };
  };

  window.__tr_executarTeste = async function() {
    const d = ler(); if (!d.ativo) return { ok: false, erro: 'Teste de redes não ativo' };
    const resultados = { id: 'tr_' + Date.now(), executadoEm: new Date().toISOString(), redes_testadas: REDES_TESTE.length, online: 0, offline: 0, postagem_disponivel: 0, detalhe: [] };
    for (const rede of REDES_TESTE) {
      const r = await fetchComTimeout(rede.endpoint);
      const online = r.ok;
      const temToken = !!(localStorage.getItem('rebocl_chave_' + rede.nome));
      const podePostar = temToken && online;
      if (online) resultados.online++;
      else resultados.offline++;
      if (podePostar) resultados.postagem_disponivel++;
      resultados.detalhe.push({
        rede: rede.nome,
        online,
        status_http: r.status,
        pode_postar: podePostar,
        tem_token: temToken,
        erro: r.erro || null,
        motivo: online
          ? temToken
            ? (podePostar ? 'Online e pronto para postar' : 'Online com token, postagem não confirmada')
            : 'Online (sem chave — somente leitura)'
          : 'Offline ou inalcançável: ' + (r.erro || 'sem resposta'),
        testadoEm: new Date().toISOString()
      });
    }
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
