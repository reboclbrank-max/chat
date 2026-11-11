// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💾 MEMÓRIA PERSISTENTE VIA GITHUB — versão navegador
// Lê e salva memória de conversa no repositório GitHub usando o token do dono
// já configurado no navegador. Sobrevive a limpeza de localStorage.
// Só serve marketing de Prancheta e Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function (global) {
  'use strict';

  const REPO_MEMORIA = 'reboclbrank-max/chat';
  const BRANCH_MEMORIA = 'main';
  const ARQUIVO_MEMORIA = 'posts/marketing/memoria-persistente.json';
  const CHAVE_LOCAL = 'assistente_rebocl_memoria_github_sync_v1';
  const INTERVALO_SINC = 5 * 60 * 1000; // 5 min

  let ultimaSincronizacao = 0;

  function headersGitHub(token) {
    return {
      Authorization: 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'rebocl-casa/1',
      'Content-Type': 'application/json',
    };
  }

  function lerTokenGithub() {
    try {
      const t = localStorage.getItem('rebocl_chave_github');
      if (t) return t;
    } catch (e) {}
    return null;
  }

  async function lerMemoriaGitHub(token, forcar = false) {
    const agora = Date.now();
    if (!forcar && ultimaSincronizacao && agora - ultimaSincronizacao < INTERVALO_SINC) {
      try {
        const b = localStorage.getItem(CHAVE_LOCAL);
        if (b) return JSON.parse(b);
      } catch (e) {}
    }

    try {
      const r = await fetch(
        'https://api.github.com/repos/' + REPO_MEMORIA + '/contents/' + ARQUIVO_MEMORIA + '?ref=' + BRANCH_MEMORIA,
        { headers: headersGitHub(token), signal: AbortSignal.timeout(15000) }
      );
      if (!r.ok) return null;
      const j = await r.json();
      if (j.content) {
        const bruto = String(j.content).replace(/\s/g, '');
        const dados = JSON.parse(decodeURIComponent(escape(atob(bruto))));
        ultimaSincronizacao = agora;
        try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(dados)); } catch (e) {}
        return dados;
      }
      return null;
    } catch (e) { return null; }
  }

  async function salvarMemoriaGitHub(memoria, token, mensagem) {
    try {
      // Primeiro ler para obter o SHA (se existir)
      const r = await fetch(
        'https://api.github.com/repos/' + REPO_MEMORIA + '/contents/' + ARQUIVO_MEMORIA + '?ref=' + BRANCH_MEMORIA,
        { headers: headersGitHub(token), signal: AbortSignal.timeout(15000) }
      );
      let sha = null;
      if (r.ok) {
        const j = await r.json();
        sha = j.sha;
      }

      const corpo = {
        message: mensagem || '💾 atualização de memória persistente',
        content: btoa(unescape(encodeURIComponent(JSON.stringify(memoria, null, 2)))),
        branch: BRANCH_MEMORIA,
      };
      if (sha) corpo.sha = sha;

      const w = await fetch(
        'https://api.github.com/repos/' + REPO_MEMORIA + '/contents/' + ARQUIVO_MEMORIA,
        {
          method: 'PUT',
          headers: headersGitHub(token),
          body: JSON.stringify(corpo),
          signal: AbortSignal.timeout(30000),
        }
      );

      if (w.ok) {
        ultimaSincronizacao = Date.now();
        try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(memoria)); } catch (e) {}
        return { ok: true };
      }
      return { ok: false, status: w.status };
    } catch (e) { return { ok: false, erro: e.message }; }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MESCLAR MEMÓRIA LOCAL + GITHUB
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  window.__memoria_gh_mesclar = function (localMemoria, githubMemoria) {
    if (!githubMemoria) return localMemoria;
    if (!localMemoria) return githubMemoria;

    return {
      ultimoJogo: githubMemoria.ultimoJogo || localMemoria.ultimoJogo || null,
      tomPreferido: githubMemoria.tomPreferido || localMemoria.tomPreferido || 'neutro',
      horariosPreferidos: githubMemoria.horariosPreferidos || localMemoria.horariosPreferidos || [],
      metas: { ...(localMemoria.metas || {}), ...(githubMemoria.metas || {}) },
      preferencias: { ...(localMemoria.preferencias || {}), ...(githubMemoria.preferencias || {}) },
      ultimasConversas: (githubMemoria.conversas || [])
        .concat(localMemoria.ultimasConversas || [])
        .slice(-20),
      feedback: githubMemoria.feedback || [],
      fonte: 'github+local',
      sincronizadoEm: new Date().toISOString(),
    };
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SINCRONIZAR MEMÓRIA DO GITHUB PARA LOCAL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  window.__memoria_gh_sincronizar = async function () {
    const token = lerTokenGithub();
    if (!token) {
      return { ok: false, motivo: 'sem token do GitHub configurado' };
    }

    const githubMem = await lerMemoriaGitHub(token, true);
    if (!githubMem) {
      return { ok: false, motivo: 'não foi possível ler memória do GitHub' };
    }

    // Ler memória local
    let localMem = null;
    try {
      const b = localStorage.getItem('assistente_rebocl_inteligencia_memoria_v1');
      if (b) localMem = JSON.parse(b);
    } catch (e) {}

    const mesclada = window.__memoria_gh_mesclar(localMem, githubMem);

    // Salvar localmente
    try {
      localStorage.setItem('assistente_rebocl_inteligencia_memoria_v1', JSON.stringify(mesclada));
    } catch (e) {}

    return { ok: true, memoria: mesclada };
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SALVAR MEMÓRIA LOCAL PARA GITHUB
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  window.__memoria_gh_salvar = async function (memoria, mensagem) {
    const token = lerTokenGithub();
    if (!token) {
      return { ok: false, motivo: 'sem token do GitHub configurado' };
    }
    return await salvarMemoriaGitHub(memoria, token, mensagem);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VERIFICAR SE HÁ TOKEN GITHUB
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  window.__memoria_gh_temToken = function () {
    return !!lerTokenGithub();
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);