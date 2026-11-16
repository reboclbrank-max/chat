// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💾 MEMÓRIA PERSISTENTE VIA GITHUB
// Salva memória de conversa, preferências e dados de marketing no repositório
// para sobreviver a limpeza de localStorage/navegador.
// Só serve marketing de Prancheta e Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const cofre = require('./cofre-seguro');

const REPO_MEMORIA = 'reboclbrank-max/chat';
const BRANCH_MEMORIA = 'main';
const ARQUIVO_MEMORIA = 'posts/marketing/memoria-persistente.json';

let cacheMemoriaGitHub = null;
let ultimaSincronizacao = 0;
const INTERVALO_SINC = 5 * 60 * 1000; // 5 min

function headersGitHub(token) {
  return {
    Authorization: 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'rebocl-casa/1',
    'Content-Type': 'application/json',
  };
}

async function lerArquivoGitHub(caminho, token) {
  try {
    const r = await fetch(
      'https://api.github.com/repos/' + REPO_MEMORIA + '/contents/' + caminho + '?ref=' + BRANCH_MEMORIA,
      { headers: headersGitHub(token), signal: AbortSignal.timeout(15000) }
    );
    if (!r.ok) return null;
    const j = await r.json();
    if (j.content) {
      const bruto = String(j.content).replace(/\s/g, '');
      return JSON.parse(decodeURIComponent(escape(atob(bruto))));
    }
    return null;
  } catch (e) { return null; }
}

async function escreverArquivoGitHub(caminho, conteudo, mensagem, token, sha) {
  try {
    const corpo = {
      message: mensagem,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(conteudo, null, 2)))),
      branch: BRANCH_MEMORIA,
    };
    if (sha) corpo.sha = sha;
    const r = await fetch(
      'https://api.github.com/repos/' + REPO_MEMORIA + '/contents/' + caminho,
      {
        method: 'PUT',
        headers: headersGitHub(token),
        body: JSON.stringify(corpo),
        signal: AbortSignal.timeout(30000),
      }
    );
    return { ok: r.ok, status: r.status, sha: r.ok ? (await r.json()).content?.sha : null };
  } catch (e) { return { ok: false, erro: e.message }; }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CARREGAR MEMÓRIA DO GITHUB (com cache local)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function carregarMemoriaGitHub(token, forcar = false) {
  const agora = Date.now();
  if (!forcar && cacheMemoriaGitHub && agora - ultimaSincronizacao < INTERVALO_SINC) {
    return cacheMemoriaGitHub;
  }

  const existente = await lerArquivoGitHub(ARQUIVO_MEMORIA, token);
  if (existente) {
    cacheMemoriaGitHub = existente;
    ultimaSincronizacao = agora;
    return existente;
  }

  // Arquivo não existe ainda — criar vazio
  const vazio = {
    versoes: [],
    memoriaConversa: {},
    preferencias: {},
    dadosMarketing: {},
    feedback: [],
    conversas: [],
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
  const resultado = await escreverArquivoGitHub(
    ARQUIVO_MEMORIA,
    vazio,
    '💾 criar memória persistente inicial',
    token
  );
  if (resultado.ok) {
    cacheMemoriaGitHub = vazio;
    ultimaSincronizacao = agora;
  }
  return vazio;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SALVAR MEMÓRIA NO GITHUB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function salvarMemoriaGitHub(memoria, token, mensagem) {
  const existente = await carregarMemoriaGitHub(token);
  const novaVersao = {
    quando: new Date().toISOString(),
    mensagem: mensagem || 'atualização de memória',
    sha: existente.sha || null,
  };

  const atualizada = {
    ...memoria,
    versoes: (existente.versoes || []).concat([novaVersao]).slice(-50), // manter últimas 50
    atualizadoEm: new Date().toISOString(),
  };

  const resultado = await escreverArquivoGitHub(
    ARQUIVO_MEMORIA,
    atualizada,
    '💾 ' + (mensagem || 'atualização de memória'),
    token,
    existente.sha || undefined
  );

  if (resultado.ok) {
    cacheMemoriaGitHub = atualizada;
    ultimaSincronizacao = Date.now();
  }
  return resultado;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MESCLAR MEMÓRIA LOCAL + GITHUB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function mesclarMemoria(localMemoria, githubMemoria) {
  const resultado = {
    ultimoJogo: githubMemoria.ultimoJogo || localMemoria.ultimoJogo || null,
    tomPreferido: githubMemoria.tomPreferido || localMemoria.tomPreferido || 'neutro',
    horariosPreferidos: githubMemoria.horariosPreferidos || localMemoria.horariosPreferidos || [],
    metas: { ...(localMemoria.metas || {}), ...(githubMemoria.metas || {}) },
    preferencias: { ...(localMemoria.preferencias || {}), ...(githubMemoria.preferencias || {}) },
    ultimasConversas: (githubMemoria.conversas || [])
      .concat(localMemoria.ultimasConversas || [])
      .slice(-20),
    feedback: githubMemoria.feedback || [],
    fonte: githubMemoria ? 'github+local' : 'local',
  };
  return resultado;
}

module.exports = {
  carregarMemoriaGitHub,
  salvarMemoriaGitHub,
  mesclarMemoria,
  lerArquivoGitHub,
  escreverArquivoGitHub,
  REPO_MEMORIA,
  ARQUIVO_MEMORIA,
};