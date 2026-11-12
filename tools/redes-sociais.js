// 📱 REDES SOCIAIS — postagem unificada em todas as plataformas
// v1 (09/11/2026): cada rede tem suas funções de POSTAR e MEDIR.
// Todas as chamadas usam o cofre seguro (cofre-seguro.js) para credenciais.
// Nenhuma credencial entra em texto claro no log.
// Regras: (1) só posta se a credencial estiver configurada;
// (2) recusa com motivo e números se não estiver;
// (3) falha nunca vira sucesso;
// (4) toda publicação registra resultado (sucesso ou falha).

const cofre = require('./cofre-seguro');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const NL = '\n';

// 🔄 Auto-correção e aprendizado integrados ao fluxo de postagem
const aprendizado = require('./auto-correcao-aprendizado');

function verificarTextoAntesDePostar(texto, rede) {
  const verificacao = aprendizado.verificarPalavrasBloqueadas(texto);
  if (!verificacao.limpo) {
    return { bloqueado: true, motivo: verificacao.sugestao };
  }
  return { bloqueado: false };
}

function registrarResultadoPostagem(servico, sucesso, texto, formato, jogo = null, engajamento = 0) {
  // Registrar aprendizado com base no resultado
  const desempenho = sucesso && engajamento > 0 ? 'alto' : (sucesso ? 'medio' : 'baixo');
  aprendizado.registrarConteudoResultado(texto, formato, servico, desempenho, jogo ? [jogo] : []);

  // Registrar métrica de marketing
  const tipoMetrica = sucesso ? 'sucessos' : 'falhas';
  try {
    aprendizado.registrarHorarioDesempenho(servico, new Date().getHours().toString() + 'h', engajamento, sucesso);
  } catch (e) {}
}

const PUBLICACOES = []; // { servico, quando, sucesso, detalhe, idPublicacao, formato }
const HISTORICO_FORMATOS = {}; // { servico: ['foto', 'video', 'post', ...] }
const DESEMPENHO_FORMATO = {}; // { servico: { formato: { total, sucesso, zeros } } }

// ━━━━.*?
// 📺 YOUTUBE — comentar em vídeo (OAuth do dono via workflow do site)
// Como os segredos OAuth estão no repo site, usa o disparo de workflow para
// executar ações que exigem autenticação do YouTube.
async function comentarYoutube(videoId, texto) {
  const pat = cofre.ler('github', 'comentarYoutube');
  if (!pat) return registrar('youtube', false, 'sem GITHUB_TOKEN para disparar workflow');
  try {
    const r = await fetch('https://api.github.com/repos/reboclbrank-max/site/actions/workflows/comentar-youtube.yml/dispatches', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pat}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'rebocl-casa/1',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          video_id: videoId,
          comentario: texto.slice(0, 500),
        },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (r.status === 204) {
      return registrar('youtube', true, 'workflow de comentário disparado no repo site', videoId);
    }
    const erro = await r.text().catch(() => '');
    return registrar('youtube', false, `workflow comentário falhou: HTTP ${r.status}: ${erro.slice(0, 100)}`);
  } catch (e) {
    return registrar('youtube', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📺 YOUTUBE — curtir vídeo (via workflow do site)
async function curtirYoutube(videoId) {
  const pat = cofre.ler('github', 'curtirYoutube');
  if (!pat) return registrar('youtube', false, 'sem GITHUB_TOKEN para disparar workflow');
  try {
    const r = await fetch('https://api.github.com/repos/reboclbrank-max/site/actions/workflows/curtir-youtube.yml/dispatches', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pat}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'rebocl-casa/1',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          video_id: videoId,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (r.status === 204) {
      return registrar('youtube', true, 'workflow de curtir disparado no repo site', videoId);
    }
    const erro = await r.text().catch(() => '');
    return registrar('youtube', false, `workflow curtir falhou: HTTP ${r.status}: ${erro.slice(0, 100)}`);
  } catch (e) {
    return registrar('youtube', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💬 DISCORD — enviar mensagem em canal (exige servidor criado e bot autorizado)
async function postarDiscord(canalId, texto) {
  const token = cofre.ler('discord', 'postarDiscord');
  if (!token) return registrar('discord', false, 'sem DISCORD_BOT_TOKEN configurado');
  try {
    const r = await fetch(`https://discord.com/api/v10/channels/${canalId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: texto.slice(0, 2000) }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) {
      const erro = await r.text().catch(() => '');
      return registrar('discord', false, `HTTP ${r.status}: ${erro.slice(0, 100)}`);
    }
    const j = await r.json();
    return registrar('discord', true, 'mensagem enviada', j.id);
  } catch (e) {
    return registrar('discord', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📝 DEV.TO — publicar artigo
async function postarDevto(titulo, corpoMarkdown, tags = []) {
  const key = cofre.ler('devto', 'postarDevto');
  if (!key) return registrar('devto', false, 'sem DEVTO_API_KEY configurado');
  try {
    const artigo = {
      article: {
        title: titulo.slice(0, 200),
        body_markdown: corpoMarkdown,
        published: true,
        tags: tags.slice(0, 4),
      },
    };
    const r = await fetch('https://dev.to/api/articles', {
      method: 'POST',
      headers: {
        'api-key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(artigo),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) {
      const erro = await r.text().catch(() => '');
      return registrar('devto', false, `HTTP ${r.status}: ${erro.slice(0, 100)}`);
    }
    const j = await r.json();
    return registrar('devto', true, 'artigo publicado', j.id);
  } catch (e) {
    return registrar('devto', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📧 TUMBLR — postar no blog (exige OAuth2 com refresh token)
async function postarTumblr(titulo, corpo, tags = []) {
  const consumerKey = cofre.ler('tumblr_key', 'postarTumblr');
  const consumerSecret = cofre.ler('tumblr_secret', 'postarTumblr');
  const refreshToken = cofre.ler('tumblr_refresh', 'postarTumblr');
  if (!consumerKey || !consumerSecret || !refreshToken) {
    return registrar('tumblr', false, 'sem TUMBLR_CONSUMER_KEY / SECRET / REFRESH_TOKEN completo');
  }
  try {
    // Tumblr OAuth2: usar refresh token para obter access token
    const tokenResp = await fetch('https://api.tumblr.com/v2/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: consumerKey,
        client_secret: consumerSecret,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!tokenResp.ok) return registrar('tumblr', false, `refresh token falhou: HTTP ${tokenResp.status}`);
    const tokenJ = await tokenResp.json();
    const accessToken = tokenJ.access_token;
    const blogName = 'reboclbrank';

    const post = {
      type: 'text',
      title: titulo.slice(0, 200),
      body: corpo,
      tags: tags.join(','),
      state: 'published',
    };

    const r = await fetch(`https://api.tumblr.com/v2/blog/${blogName}.tumblr.com/post`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(post),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) {
      const erro = await r.text().catch(() => '');
      return registrar('tumblr', false, `post falhou: HTTP ${r.status}: ${erro.slice(0, 100)}`);
    }
    const j = await r.json();
    return registrar('tumblr', true, 'post publicado', j.response ? j.response.id : 'desconhecido');
  } catch (e) {
    return registrar('tumblr', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔢 NOSTR — postar nota (chave hex privada)
const { getPublicKey, signEvent, calculateEventHash, serializeEvent, nip19 } = require('nostr');

const NOSTR_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
];

async function postarNostr(texto) {
  const chaveHex = cofre.ler('nostr', 'postarNostr');
  if (!chaveHex) return registrar('nostr', false, 'sem NOSTR_KEY configurado');
  try {
    const hexValido = /^[0-9a-f]{64}$/.test(chaveHex);
    let privateKey = chaveHex;
    let npub = null;
    if (!hexValido) {
      // Pode ser npub ou nsec
      try {
        const decoded = nip19.decode(chaveHex);
        if (decoded.type === 'nsec') {
          privateKey = decoded.data;
        } else if (decoded.type === 'npub') {
          npub = decoded.data;
          privateKey = null;
        }
      } catch (e) {
        return registrar('nostr', false, 'chave NOSTR não é hex válido, npub nem nsec');
      }
    }

    if (privateKey) {
      const pubKey = getPublicKey(privateKey);
      const event = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: texto.slice(0, 280),
        pubkey: pubKey,
      };
      const hash = calculateEventHash(event);
      const sig = signEvent(event, privateKey);
      event.id = hash;
      event.sig = sig;
      const serialized = serializeEvent(event);

      let publicados = 0;
      let erros = 0;
      for (const relayUrl of NOSTR_RELAYS) {
        try {
          const ws = new WebSocket(relayUrl);
          await new Promise((resolve, reject) => {
            ws.onopen = resolve;
            ws.onerror = reject;
            ws.onmessage = () => {};
            setTimeout(() => reject(new Error('timeout relay')), 10000);
          });
          ws.send(JSON.stringify(['EVENT', event]));
          await new Promise((resolve) => setTimeout(resolve, 500));
          ws.close();
          publicados++;
        } catch (e) {
          erros++;
        }
      }

      if (publicados > 0) {
        return registrar('nostr', true, `nota publicada em ${publicados} relay(s)`, event.id);
      }
      return registrar('nostr', false, `falha ao publicar em todos os ${NOSTR_RELAYS.length} relay(s)`);
    }

    if (npub) {
      return registrar('nostr', false, 'apenas npub fornecido — é necessário nsec (chave privada) para postar');
    }
  } catch (e) {
    return registrar('nostr', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔢 NOSTR — ler notas dos relays (busca pública)
async function lerNostr(autorNpub = null, limite = 20) {
  try {
    const filtro = {
      kinds: [1],
      limit: limite,
    };
    if (autorNpub) {
      // Converter npub para hex pubkey se necessário
      let pubkeyHex = autorNpub;
      if (autorNpub.startsWith('npub1')) {
        try {
          const decoded = nip19.decode(autorNpub);
          pubkeyHex = decoded.data;
        } catch (e) {
          return registrar('nostr', false, 'npub do autor inválido');
        }
      }
      filtro.authors = [pubkeyHex];
    }

    const requisicao = JSON.stringify(['REQ', 'chat-casa-leitura', filtro]);
    const notas = [];
    let resolvidos = 0;

    for (const relayUrl of NOSTR_RELAYS) {
      resolvidos++;
      try {
        const ws = new WebSocket(relayUrl);
        await new Promise((resolve, reject) => {
          ws.onopen = resolve;
          ws.onerror = reject;
          setTimeout(() => reject(new Error('timeout relay leitura')), 15000);
        });

        ws.send(requisicao);

        const timeoutPromise = new Promise((_, rejeita) =>
          setTimeout(() => rejeita(new Error('timeout coleta')), 10000)
        );

        const coletaPromise = new Promise((resolve) => {
          ws.onmessage = (evt) => {
            try {
              const msg = JSON.parse(evt.data);
              if (msg[0] === 'EVENT' && msg[2]) {
                notas.push({
                  id: msg[2].id,
                  autor: msg[2].pubkey,
                  conteudo: msg[2].content,
                  criado: msg[2].created_at,
                  relay: relayUrl,
                });
              }
              if (msg[0] === 'EOSE') {
                resolve();
              }
            } catch (e) {
              // ignora mensagem malformada
            }
          };
          ws.onclose = () => resolve();
        });

        await Promise.race([coletaPromise, timeoutPromise]);
        ws.close();
      } catch (e) {
        // relay falhou, tenta o próximo
      }
    }

    if (notas.length > 0) {
      return registrar('nostr', true, `${notas.length} nota(s) lida(s) de ${resolvidos} relay(s)`, notas.length);
    }
    return registrar('nostr', true, 'nenhuma nota encontrada (relays acessíveis)', 0);
  } catch (e) {
    return registrar('nostr', false, `erro ao ler: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🐦 X (TWITTER) — postar tweet e ler timeline (OAuth 1.0a API v2)
function gerarOAuthX(metodo, url, parametrosExtra = {}) {
  const consumerKey = cofre.ler('x_api_key', 'gerarOAuthX');
  const consumerSecret = cofre.ler('x_api_secret', 'gerarOAuthX');
  const accessToken = cofre.ler('x_access_token', 'gerarOAuthX');
  const accessTokenSecret = cofre.ler('x_access_token_secret', 'gerarOAuthX');
  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) return null;

  const oauth = {
    oauth_consumer_key: consumerKey,
    oauth_token: accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: Math.random().toString(36).substring(2, 18),
    oauth_version: '1.0',
  };

  const todosParametros = { ...oauth, ...parametrosExtra };
  const chavesOrdenadas = Object.keys(todosParametros).sort();
  const stringParametros = chavesOrdenadas
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(todosParametros[k])}`)
    .join('&');

  const stringAssinatura = `${metodo.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(stringParametros)}`;
  const chave = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(accessTokenSecret)}`;
  const hmac = crypto.createHmac('sha1', chave).update(stringAssinatura).digest('base64');

  oauth.oauth_signature = hmac;

  const cabecalhoPartes = Object.keys(oauth)
    .sort()
    .map((k) => `${k}="${encodeURIComponent(oauth[k])}"`);
  return `OAuth ${cabecalhoPartes.join(', ')}`;
}

async function postarX(texto, respostaParaId = null) {
  const cabecalho = gerarOAuthX('POST', 'https://api.twitter.com/2/tweets');
  if (!cabecalho) {
    return registrar('x', false, 'sem X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET configurado');
  }
  try {
    const corpo = { text: texto.slice(0, 280) };
    if (respostaParaId) corpo.reply = { in_reply_to_tweet_id: respostaParaId };

    const r = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: cabecalho,
        'Content-Type': 'application/json',
        'User-Agent': 'rebocl-casa/1',
      },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) {
      const erro = await r.text().catch(() => '');
      return registrar('x', false, `post falhou: HTTP ${r.status}: ${erro.slice(0, 100)}`);
    }
    const j = await r.json();
    return registrar('x', true, 'tweet publicado', j.data ? j.data.id : 'desconhecido');
  } catch (e) {
    return registrar('x', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

async function lerX(usuario = null, limite = 20) {
  const cabecalho = gerarOAuthX('GET', 'https://api.twitter.com/2/tweets');
  if (!cabecalho) {
    return registrar('x', false, 'sem credenciais X configuradas para leitura');
  }
  try {
    let url = `https://api.twitter.com/2/tweets/sample/stream`;
    // Usar endpoint de busca simples sem user_id específico (sample stream)
    // Para usuário específico, precisa do user_id:
    // https://api.twitter.com/2/users/:id/tweets
    const parametros = new URLSearchParams({ 'max_results': String(Math.min(limite, 100)) });
    if (usuario) {
      // Tentar resolver username para user_id via lookup
      const lookup = await fetch(`https://api.twitter.com/2/users/by/username/${usuario}`, {
        headers: { Authorization: cabecalho, 'User-Agent': 'rebocl-casa/1' },
        signal: AbortSignal.timeout(15000),
      });
      if (lookup.ok) {
        const lj = await lookup.json();
        url = `https://api.twitter.com/2/users/${lj.data.id}/tweets?${parametros}`;
      } else {
        return registrar('x', false, `usuário X não encontrado: HTTP ${lookup.status}`);
      }
    } else {
      url = `https://api.twitter.com/2/tweets/search/recent?query=ceifalume&${parametros}`;
    }

    const r = await fetch(url, {
      headers: { Authorization: cabecalho, 'User-Agent': 'rebocl-casa/1' },
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) {
      const erro = await r.text().catch(() => '');
      return registrar('x', false, `leitura falhou: HTTP ${r.status}: ${erro.slice(0, 100)}`);
    }
    const j = await r.json();
    const tweets = j.data || [];
    return registrar('x', true, `${tweets.length} tweet(s) lido(s)`, tweets.length);
  } catch (e) {
    return registrar('x', false, `erro ao ler X: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🤝 INTERAÇÃO — responder, curtir, repostar, seguir em todas as redes
// Cada função recebe o identificador do alvo (issue, tweet, toot, etc.) e interage.

// ━ GITHUB — comentar em issue ou PR
async function comentarGitHub(numero, texto) {
  const token = cofre.ler('github', 'comentarGitHub');
  if (!token) return registrar('github', false, 'sem GITHUB_TOKEN');
  try {
    const r = await fetch(`https://api.github.com/repos/reboclbrank-max/site/issues/${numero}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'rebocl-casa/1',
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: texto.slice(0, 65000) }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) {
      const erro = await r.text().catch(() => '');
      return registrar('github', false, `comentar falhou: HTTP ${r.status}: ${erro.slice(0, 100)}`);
    }
    const j = await r.json();
    return registrar('github', true, 'comentário postado na issue/PR #${numero}', j.id);
  } catch (e) {
    return registrar('github', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━ BLUESKY — responder, repostar, curtir
async function interagirBluesky(acao, uriAlvo, textoResposta = null) {
  const handle = cofre.ler('bluesky_handle', 'interagirBluesky');
  const senha = cofre.ler('bluesky_pass', 'interagirBluesky') || cofre.ler('bluesky_pass_alt', 'interagirBluesky');
  if (!handle || !senha) return registrar('bluesky', false, 'sem BLUESKY_HANDLE ou BLUESKY_APPPASS');
  try {
    const login = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: handle, password: senha }),
      signal: AbortSignal.timeout(30000),
    });
    if (!login.ok) return registrar('bluesky', false, `login falhou: HTTP ${login.status}`);
    const j = await login.json();
    const accessJwt = j.accessJwt;
    const did = j.did;

    if (acao === 'responder' && textoResposta) {
      const registro = {
        $type: 'app.bsky.feed.post',
        text: textoResposta.slice(0, 300),
        createdAt: new Date().toISOString(),
        reply: { root: { uri: uriAlvo, cid: uriAlvo }, parent: { uri: uriAlvo, cid: uriAlvo } },
      };
      const r = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessJwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: did, collection: 'app.bsky.feed.post', record: registro }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('bluesky', false, `responder falhou: HTTP ${r.status}`);
      return registrar('bluesky', true, 'resposta postada no Bluesky');
    }

    if (acao === 'repostar') {
      const registro = {
        $type: 'app.bsky.feed.repost',
        subject: { uri: uriAlvo, cid: uriAlvo },
        createdAt: new Date().toISOString(),
      };
      const r = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessJwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: did, collection: 'app.bsky.feed.repost', record: registro }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('bluesky', false, `repostar falhou: HTTP ${r.status}`);
      return registrar('bluesky', true, 'repost no Bluesky');
    }

    if (acao === 'curtir') {
      const registro = {
        $type: 'app.bsky.feed.like',
        subject: { uri: uriAlvo, cid: uriAlvo },
        createdAt: new Date().toISOString(),
      };
      const r = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessJwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: did, collection: 'app.bsky.feed.like', record: registro }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('bluesky', false, `curtir falhou: HTTP ${r.status}`);
      return registrar('bluesky', true, 'curtida no Bluesky');
    }

    return registrar('bluesky', false, 'ação não reconhecida: usar responder, repostar ou curtir');
  } catch (e) {
    return registrar('bluesky', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━ MASTODON — responder, favoritar, boostar, seguir
async function interagirMastodon(acao, idAlvo, textoResposta = null, usuarioParaSeguir = null) {
  const token = cofre.ler('mastodon', 'interagirMastodon');
  if (!token) return registrar('mastodon', false, 'sem MASTODON_TOKEN');
  try {
    if (acao === 'responder' && textoResposta) {
      const r = await fetch('https://mastodon.social/api/v1/statuses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: textoResposta.slice(0, 500), in_reply_to_id: idAlvo, language: 'pt' }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('mastodon', false, `responder falhou: HTTP ${r.status}`);
      return registrar('mastodon', true, 'resposta postada no Mastodon');
    }

    if (acao === 'favoritar') {
      const r = await fetch(`https://mastodon.social/api/v1/statuses/${idAlvo}/favourite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('mastodon', false, `favoritar falhou: HTTP ${r.status}`);
      return registrar('mastodon', true, 'favoritado no Mastodon');
    }

    if (acao === 'boostar') {
      const r = await fetch(`https://mastodon.social/api/v1/statuses/${idAlvo}/reblog`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('mastodon', false, `boostar falhou: HTTP ${r.status}`);
      return registrar('mastodon', true, 'boost no Mastodon');
    }

    if (acao === 'seguir' && usuarioParaSeguir) {
      const r = await fetch('https://mastodon.social/api/v1/accounts/follows', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_acct: usuarioParaSeguir }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('mastodon', false, `seguir falhou: HTTP ${r.status}`);
      return registrar('mastodon', true, 'seguindo ${usuarioParaSeguir} no Mastodon');
    }

    return registrar('mastodon', false, 'ação não reconhecida');
  } catch (e) {
    return registrar('mastodon', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━ INSTAGRAM — comentar, curtir, seguir (limitado pela API)
async function interagirInstagram(acao, idMedia, comentarioTexto = null, usuarioParaSeguir = null) {
  const token = cofre.ler('instagram', 'interagirInstagram');
  if (!token) return registrar('instagram', false, 'sem IG_TOKEN');
  try {
    if (acao === 'comentar' && comentarioTexto) {
      const r = await fetch(`https://graph.instagram.com/v21.0/${idMedia}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: comentarioTexto.slice(0, 2200), access_token: token }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('instagram', false, `comentar falhou: HTTP ${r.status}`);
      return registrar('instagram', true, 'comentário postado no Instagram');
    }

    if (acao === 'curtir') {
      const r = await fetch(`https://graph.instagram.com/v21.0/${idMedia}/likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('instagram', false, `curtir falhou: HTTP ${r.status}`);
      return registrar('instagram', true, 'curtida no Instagram');
    }

    return registrar('instagram', false, 'ação não reconhecida ou não suportada pela API do Instagram');
  } catch (e) {
    return registrar('instagram', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━ THREADS — responder, curtir
async function interagirThreads(acao, idContainer, textoResposta = null) {
  const token = cofre.ler('threads', 'interagirThreads') || cofre.ler('threads_alt', 'interagirThreads');
  if (!token) return registrar('threads', false, 'sem THREADS_TOKEN');
  try {
    if (acao === 'responder' && textoResposta) {
      const me = await fetch(`https://graph.threads.net/v1.0/me?fields=id`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(30000),
      });
      if (!me.ok) return registrar('threads', false, `me falhou: HTTP ${me.status}`);
      const mj = await me.json();
      const userId = mj.id;

      const corpo = new URLSearchParams();
      corpo.append('media_type', 'TEXT');
      corpo.append('text', textoResposta.slice(0, 500));
      corpo.append('reply_control', 'conversation');

      const container = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: corpo,
        signal: AbortSignal.timeout(30000),
      });
      if (!container.ok) return registrar('threads', false, `responder falhou: HTTP ${container.status}`);
      return registrar('threads', true, 'resposta postada no Threads');
    }

    return registrar('threads', false, 'ação não reconhecida ou não suportada');
  } catch (e) {
    return registrar('threads', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━ DISCORD — reagir, responder em canal
async function interagirDiscord(acao, canalId, mensagemId, textoResposta = null, emoji = '👍') {
  const token = cofre.ler('discord', 'interagirDiscord');
  if (!token) return registrar('discord', false, 'sem DISCORD_BOT_TOKEN');
  try {
    if (acao === 'responder' && textoResposta && canalId) {
      const r = await fetch(`https://discord.com/api/v10/channels/${canalId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textoResposta.slice(0, 2000), message_reference: { message_id: mensagemId } }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('discord', false, `responder falhou: HTTP ${r.status}`);
      return registrar('discord', true, 'resposta enviada no Discord');
    }

    if (acao === 'reagir' && mensagemId && canalId) {
      const r = await fetch(`https://discord.com/api/v10/channels/${canalId}/messages/${mensagemId}/reactions/${emoji}/@me`, {
        method: 'PUT',
        headers: { Authorization: `Bot ${token}` },
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('discord', false, `reagir falhou: HTTP ${r.status}`);
      return registrar('discord', true, 'reação adicionada no Discord');
    }

    return registrar('discord', false, 'ação não reconhecida');
  } catch (e) {
    return registrar('discord', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━ DEV.TO — comentar artigo, curtir
async function interagirDevto(acao, idArtigo, comentarioTexto = null) {
  const key = cofre.ler('devto', 'interagirDevto');
  if (!key) return registrar('devto', false, 'sem DEVTO_API_KEY');
  try {
    if (acao === 'comentar' && comentarioTexto) {
      const r = await fetch('https://dev.to/api/comments', {
        method: 'POST',
        headers: { 'api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: comentarioTexto.slice(0, 65000), article_id: idArtigo }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('devto', false, `comentar falhou: HTTP ${r.status}`);
      return registrar('devto', true, 'comentário postado no dev.to');
    }

    if (acao === 'curtir') {
      const r = await fetch(`https://dev.to/api/articles/${idArtigo}/like`, {
        method: 'POST',
        headers: { 'api-key': key },
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('devto', false, `curtir falhou: HTTP ${r.status}`);
      return registrar('devto', true, 'curtida no dev.to');
    }

    return registrar('devto', false, 'ação não reconhecida');
  } catch (e) {
    return registrar('devto', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━ TUMBLR — reblog, curtir, seguir
async function interagirTumblr(acao, idPost, blogParaSeguir = null) {
  const consumerKey = cofre.ler('tumblr_key', 'interagirTumblr');
  const consumerSecret = cofre.ler('tumblr_secret', 'interagirTumblr');
  const refreshToken = cofre.ler('tumblr_refresh', 'interagirTumblr');
  if (!consumerKey || !consumerSecret || !refreshToken) {
    return registrar('tumblr', false, 'sem credenciais Tumblr completas');
  }
  try {
    // Obter access token via refresh
    const tokenResp = await fetch('https://api.tumblr.com/v2/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: consumerKey, client_secret: consumerSecret }),
      signal: AbortSignal.timeout(30000),
    });
    if (!tokenResp.ok) return registrar('tumblr', false, `refresh falhou: HTTP ${tokenResp.status}`);
    const tokenJ = await tokenResp.json();
    const accessToken = tokenJ.access_token;

    if (acao === 'reblog') {
      const r = await fetch(`https://api.tumblr.com/v2/blog/reboclbrank.tumblr.com/post/reblog`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: idPost }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('tumblr', false, `reblog falhou: HTTP ${r.status}`);
      return registrar('tumblr', true, 'reblog no Tumblr');
    }

    if (acao === 'curtir') {
      const r = await fetch(`https://api.tumblr.com/v2/user/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: idPost }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('tumblr', false, `curtir falhou: HTTP ${r.status}`);
      return registrar('tumblr', true, 'curtida no Tumblr');
    }

    return registrar('tumblr', false, 'ação não reconhecida');
  } catch (e) {
    return registrar('tumblr', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━ NOSTR — zap (like), repost, reply
async function interagirNostr(acao, eventId, autorPubkey, textoResposta = null) {
  const chaveHex = cofre.ler('nostr', 'interagirNostr');
  if (!chaveHex) return registrar('nostr', false, 'sem NOSTR_KEY');
  try {
    const hexValido = /^[0-9a-f]{64}$/.test(chaveHex);
    let privateKey = chaveHex;
    if (!hexValido) {
      try {
        const decoded = nip19.decode(chaveHex);
        if (decoded.type === 'nsec') privateKey = decoded.data;
        else return registrar('nostr', false, 'precisa de nsec (chave privada) para interagir no Nostr');
      } catch (e) {
        return registrar('nostr', false, 'chave NOSTR inválida');
      }
    }

    const pubKey = getPublicKey(privateKey);

    if (acao === 'zap' || acao === 'curtir') {
      // Nostr zap = reação kind 7
      const evento = {
        kind: 7,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['e', eventId], ['p', autorPubkey]],
        content: '',
        pubkey: pubKey,
      };
      const hash = calculateEventHash(evento);
      const sig = signEvent(evento, privateKey);
      evento.id = hash;
      evento.sig = sig;
      const publicado = await publicarNostrRelay(evento);
      if (publicado) return registrar('nostr', true, 'zap (like) enviado no Nostr');
      return registrar('nostr', false, 'falha ao enviar zap no Nostr');
    }

    if (acao === 'repostar') {
      const evento = {
        kind: 6,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['e', eventId], ['p', autorPubkey]],
        content: '',
        pubkey: pubKey,
      };
      const hash = calculateEventHash(evento);
      const sig = signEvent(evento, privateKey);
      evento.id = hash;
      evento.sig = sig;
      const publicado = await publicarNostrRelay(evento);
      if (publicado) return registrar('nostr', true, 'repost (repost NIP-18) no Nostr');
      return registrar('nostr', false, 'falha ao repostar no Nostr');
    }

    if (acao === 'responder' && textoResposta) {
      const evento = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['e', eventId], ['p', autorPubkey], ['root', eventId]],
        content: textoResposta.slice(0, 280),
        pubkey: pubKey,
      };
      const hash = calculateEventHash(evento);
      const sig = signEvent(evento, privateKey);
      evento.id = hash;
      evento.sig = sig;
      const publicado = await publicarNostrRelay(evento);
      if (publicado) return registrar('nostr', true, 'resposta no Nostr');
      return registrar('nostr', false, 'falha ao responder no Nostr');
    }

    return registrar('nostr', false, 'ação não reconhecida no Nostr');
  } catch (e) {
    return registrar('nostr', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

async function publicarNostrRelay(evento) {
  const serializado = serializeEvent(evento);
  let sucesso = 0;
  for (const relayUrl of NOSTR_RELAYS) {
    try {
      const ws = new WebSocket(relayUrl);
      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
        setTimeout(() => reject(new Error('timeout')), 10000);
      });
      ws.send(JSON.stringify(['EVENT', evento]));
      await new Promise((resolve) => setTimeout(resolve, 500));
      ws.close();
      sucesso++;
    } catch (e) { /* ignora */ }
  }
  return sucesso > 0;
}

// ━ X (TWITTER) — responder, curtir, retweet, seguir
async function interagirX(acao, idTweet, textoResposta = null, usuarioParaSeguir = null) {
  const cabecalho = gerarOAuthX('POST', 'https://api.twitter.com/2/tweets');
  if (!cabecalho) return registrar('x', false, 'sem credenciais X configuradas');
  try {
    if (acao === 'responder' && textoResposta) {
      const r = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: { Authorization: cabecalho, 'Content-Type': 'application/json', 'User-Agent': 'rebocl-casa/1' },
        body: JSON.stringify({ text: textoResposta.slice(0, 280), reply: { in_reply_to_tweet_id: idTweet } }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('x', false, `responder falhou: HTTP ${r.status}`);
      return registrar('x', true, 'resposta postada no X');
    }

    if (acao === 'curtir') {
      const me = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: cabecalho, 'User-Agent': 'rebocl-casa/1' },
        signal: AbortSignal.timeout(30000),
      });
      if (!me.ok) return registrar('x', false, `não foi possível obter user_id: HTTP ${me.status}`);
      const mj = await me.json();
      const userId = mj.data.id;

      const r = await fetch(`https://api.twitter.com/2/users/${userId}/likes`, {
        method: 'POST',
        headers: { Authorization: cabecalho, 'Content-Type': 'application/json', 'User-Agent': 'rebocl-casa/1' },
        body: JSON.stringify({ tweet_id: idTweet }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('x', false, `curtir falhou: HTTP ${r.status}`);
      return registrar('x', true, 'curtida no X');
    }

    if (acao === 'retweet') {
      const me = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: cabecalho, 'User-Agent': 'rebocl-casa/1' },
        signal: AbortSignal.timeout(30000),
      });
      if (!me.ok) return registrar('x', false, `não foi possível obter user_id: HTTP ${me.status}`);
      const mj = await me.json();
      const userId = mj.data.id;

      const r = await fetch(`https://api.twitter.com/2/users/${userId}/retweets`, {
        method: 'POST',
        headers: { Authorization: cabecalho, 'Content-Type': 'application/json', 'User-Agent': 'rebocl-casa/1' },
        body: JSON.stringify({ tweet_id: idTweet }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('x', false, `retweet falhou: HTTP ${r.status}`);
      return registrar('x', true, 'retweet no X');
    }

    if (acao === 'seguir' && usuarioParaSeguir) {
      const me = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: cabecalho, 'User-Agent': 'rebocl-casa/1' },
        signal: AbortSignal.timeout(30000),
      });
      if (!me.ok) return registrar('x', false, `não foi possível obter user_id: HTTP ${me.status}`);
      const mj = await me.json();
      const userId = mj.data.id;

      const r = await fetch(`https://api.twitter.com/2/users/${userId}/following`, {
        method: 'POST',
        headers: { Authorization: cabecalho, 'Content-Type': 'application/json', 'User-Agent': 'rebocl-casa/1' },
        body: JSON.stringify({ target_user_id: usuarioParaSeguir }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return registrar('x', false, `seguir falhou: HTTP ${r.status}`);
      return registrar('x', true, 'seguindo ${usuarioParaSeguir} no X');
    }

    return registrar('x', false, 'ação não reconhecida no X');
  } catch (e) {
    return registrar('x', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━ GMAIL — responder email
async function responderGmail(messageId, textoResposta) {
  const addr = cofre.ler('gmail_addr', 'responderGmail');
  const pass = cofre.ler('gmail_pass', 'responderGmail');
  if (!addr || !pass) return registrar('gmail', false, 'sem credenciais Gmail');
  try {
    const nodemailer = require('nodemailer');
    const transporte = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: addr, pass: pass },
    });
    await transporte.sendMail({
      from: `"Casa Rebocl" <${addr}>`,
      to: addr, // responde para o dono
      subject: `Re: ${textoResposta.slice(0, 50)}`,
      text: textoResposta,
      inReplyTo: messageId,
    });
    return registrar('gmail', true, 'resposta de email enviada');
  } catch (e) {
    return registrar('gmail', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📫 GMAIL — enviar email (via SMTP do cofre)
async function enviarGmail(para, assunto, texto) {
  const addr = cofre.ler('gmail_addr', 'enviarGmail');
  const pass = cofre.ler('gmail_pass', 'enviarGmail');
  if (!addr || !pass) return registrar('gmail', false, 'sem GMAIL_CHAT_ADDR ou GMAIL_CHAT_PASS');
  try {
    const nodemailer = require('nodemailer');
    const transporte = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: addr, pass: pass },
    });
    const info = await transporte.sendMail({
      from: `"Casa Rebocl" <${addr}>`,
      to: para,
      subject: assunto,
      text: texto,
    });
    return registrar('gmail', true, 'email enviado', info.messageId);
  } catch (e) {
    return registrar('gmail', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📰 RELATÓRIO DE TODAS AS PUBLICAÇÕES
function relatorio() {
  const total = PUBLICACOES.length;
  const sucessos = PUBLICACOES.filter(p => p.sucesso).length;
  const falhas = total - sucessos;
  const porServico = {};
  for (const p of PUBLICACOES) {
    if (!porServico[p.servico]) porServico[p.servico] = { total: 0, sucessos: 0, falhas: 0 };
    porServico[p.servico].total++;
    if (p.sucesso) porServico[p.servico].sucessos++;
    else porServico[p.servico].falhas++;
  }
  return {
    total,
    sucessos,
    falhas,
    porServico,
    ultimas: PUBLICACOES.slice(-10),
  };
}

// 🕒 SISTEMA DE HORÁRIOS BASEADO EM FLUXO DE ACESSO
// Determina o melhor horário para postar em cada rede baseado em métricas de engajamento.
const FLUXO_ACESSO = {}; // { servico: { hora: { acessos, engajamento, posts } } }

function registrarFluxoAcesso(servico, hora, acessos, engajamento) {
  if (!FLUXO_ACESSO[servico]) FLUXO_ACESSO[servico] = {};
  if (!FLUXO_ACESSO[servico][hora]) {
    FLUXO_ACESSO[servico][hora] = { acessos: 0, engajamento: 0, posts: 0 };
  }
  FLUXO_ACESSO[servico][hora].acessos += acessos;
  FLUXO_ACESSO[servico][hora].engajamento += engajamento;
  FLUXO_ACESSO[servico][hora].posts += 1;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🕒 MELHOR HORÁRIO PARA POSTAR (por rede)
// Calcula baseado no fluxo de acesso histórico (acessos + engajamento por hora).
function melhorHorarioParaPostar(servico) {
  if (!FLUXO_ACESSO[servico] || Object.keys(FLUXO_ACESSO[servico]).length === 0) {
    // Sem dados históricos: retorna horário padrão baseado na janela 9h-22h BRT
    return { hora: 14, motivo: 'sem dados históricos — usando horário padrão (14h BRT)' };
  }

  const horas = Object.entries(FLUXO_ACESSO[servico]);
  let melhorHora = horas[0][0];
  let melhorPontuacao = -1;

  for (const [hora, dados] of horas) {
    // Pontuação = acessos * 0.6 + engajamento * 0.4 (ponderado)
    const pontuacao = dados.acessos * 0.6 + dados.engajamento * 0.4;
    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhorHora = hora;
    }
  }

  return {
    hora: parseInt(melhorHora),
    pontuacao: melhorPontuacao,
    dados: FLUXO_ACESSO[servico][melhorHora],
    motivo: `melhor horário baseado em fluxo de acesso (${dados.posts} posts históricos)`,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎮 SISTEMA DE PRIORIDADE — PRANCHETA E CEIFALUME (ambos igualmente)
// Alterna automaticamente entre os dois jogos para dar mesma exposição.
const JOGOS_PRIORIDADE = ['prancheta', 'ceifalume'];
let INDICE_JOGO_ATUAL = 0;

function proximoJogo() {
  const jogo = JOGOS_PRIORIDADE[INDICE_JOGO_ATUAL];
  INDICE_JOGO_ATUAL = (INDICE_JOGO_ATUAL + 1) % JOGOS_PRIORIDADE.length;
  return jogo;
}

function getJogoAtual() {
  return JOGOS_PRIORIDADE[INDICE_JOGO_ATUAL];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 POSTAR EM TODAS AS REDES DISPONÍVEI
// Posta o mesmo conteúdo em todas as redes que tiverem credencial configurada.
// Retorna resultados de cada rede.
async function postarTodas(texto, opcoes = {}) {
  // 🔒 Verificar palavras bloqueadas antes de publicar
  try {
    const verif = aprendizado.verificarPalavrasBloqueadas(texto || '');
    if (!verif.limpo) {
      registrar('sistema', false, 'Postagem bloqueada: ' + verif.sugestao);
      return [];
    }
  } catch (e) { /* não falha por causa do aprendizado */ }

  const {
    titulo = 'Post da casa',
    imagemB64 = null,
    nomeImagem = 'imagem',
    urlImagem = null,
    canalDiscord = null,
    emailPara = null,
    gameIdItch = null,
    camposItch = null,
    jogo = null,
  } = opcoes;

  const resultados = [];

  // 📚 Se não há texto, usar conteúdo evergreen
  if (!texto || texto.trim().length === 0) {
    const evergreen = obterConteudoEvergreen('apresentacao');
    if (evergreen) {
      texto = evergreen.texto;
      if (!titulo || titulo === 'Post da casa') {
        titulo = evergreen.texto.slice(0, 60);
      }
      registrar('sistema', true, 'Usando conteúdo evergreen para postagem');
    } else {
      registrar('sistema', false, 'Sem texto e sem conteúdo evergreen disponível');
      return resultados;
    }
  }

  // 😊 Analisar sentimento do texto e ajustar tom automaticamente
  const sentimento = analisarSentimento(texto);
  const ajusteTom = ajustarTomPorSentimento(sentimento.sentimento);
  if (sentimento.sentimento === 'negativo') {
    registrar('sistema', true, `Sentimento detectado: ${sentimento.sentimento} (${sentimento.pontuacao}). Tom ajustado para: ${ajusteTom.tom}`);
  }

  // GitHub (issue)
  resultados.push(await postarGitHub(texto, titulo));

  // YouTube (apenas medição, não postagem)
  resultados.push(await medirYoutube());


  // Bluesky
  resultados.push(await postarBluesky(texto, imagemB64, nomeImagem));

  // Mastodon
  resultados.push(await postarMastodon(texto, imagemB64, nomeImagem, 'image/jpeg'));

  // Instagram (precisa de URL externa da imagem) + UTM + validação de link
  if (urlImagem) {
    const linkValido = await validarLinksDoTexto(texto);
    if (!linkValido.valido) {
      const invalidos = linkValido.links.filter(l => !l.valido).map(l => l.link);
      registrar('sistema', false, `Links quebrados detectados, não publicar Instagram: ${invalidos.join(', ')}`);
    } else {
      resultados.push(await postarInstagram(texto, urlImagem));
    }
  }

  // Threads (precisa de URL externa da imagem) + UTM + validação de link
  if (urlImagem) {
    const linkValidoThreads = await validarLinksDoTexto(texto);
    if (!linkValidoThreads.valido) {
      const invalidos = linkValidoThreads.links.filter(l => !l.valido).map(l => l.link);
      registrar('sistema', false, `Links quebrados detectados, não publicar Threads: ${invalidos.join(', ')}`);
    } else {
      resultados.push(await postarThreads(texto, urlImagem));
    }
  }

  // Discord
  if (canalDiscord) {
    resultados.push(await postarDiscord(canalDiscord, texto));
  }

  // dev.to
  resultados.push(await postarDevto(titulo, texto, ['ceifalume', 'gamedev', 'indiedev']));

  // Tumblr
  resultados.push(await postarTumblr(titulo, texto, ['ceifalume', 'gamedev']));

  // Nostr
  resultados.push(await postarNostr(texto));

  // X (Twitter)
  resultados.push(await postarX(texto));

  // YouTube upload (dispara workflow no repo site)
  if (caminhoVideo) {
    resultados.push(await dispararUploadYoutube(jogo || 'ceifalume'));
  }

  // Gmail
  if (emailPara) {
    resultados.push(await enviarGmail(emailPara, titulo, texto));
  }

  return resultados;
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧪 A/B TESTING DE TEXTO E IMAGEM
// Testa duas variantes do mesmo conteúdo e mede qual performa melhor.
const AB_TESTS_DIR = path.join(__dirname, '..', 'posts', 'ab-test');
if (!fs.existsSync(AB_TESTS_DIR)) {
  fs.mkdirSync(AB_TESTS_DIR, { recursive: true });
}

let cacheAbTests = null;
function carregarAbTests() {
  if (cacheAbTests) return cacheAbTests;
  try {
    const arquivo = path.join(AB_TESTS_DIR, 'testes.json');
    if (fs.existsSync(arquivo)) {
      cacheAbTests = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
      return cacheAbTests;
    }
  } catch (e) {}
  cacheAbTests = { testes: [], resultados: [] };
  return cacheAbTests;
}
function salvarAbTests(dados) {
  try {
    fs.writeFileSync(path.join(AB_TESTS_DIR, 'testes.json'), JSON.stringify(dados, null, 2), 'utf8');
    cacheAbTests = dados;
  } catch (e) {}
}

function criarAbTest(nome, varianteA, varianteB, redes = [], metrica = 'cliques') {
  const testes = carregarAbTests();
  const teste = {
    id: 'ab_' + Date.now(),
    nome,
    varianteA,
    varianteB,
    redes,
    metrica, // 'cliques', 'engajamento', 'downloads'
    criadoEm: new Date().toISOString(),
    status: 'ativo',
    resultados: { A: 0, B: 0 },
  };
  testes.testes.push(teste);
  salvarAbTests(testes);
  return teste.id;
}

function registrarResultadoAbTest(testeId, variante, valor = 1) {
  const testes = carregarAbTests();
  const teste = testes.testes.find(t => t.id === testeId);
  if (!teste || teste.status !== 'ativo') return false;
  teste.resultados[variante] = (teste.resultados[variante] || 0) + valor;
  salvarAbTests(testes);
  return true;
}

function finalizarAbTest(testeId) {
  const testes = carregarAbTests();
  const teste = testes.testes.find(t => t.id === testeId);
  if (!teste) return null;
  teste.status = 'finalizado';
  teste.finalizadoEm = new Date().toISOString();
  teste.vencedor = teste.resultados.A >= teste.resultados.B ? 'A' : 'B';
  salvarAbTests(testes);
  return teste;
}

function obterVarianteParaPostar(testeId) {
  const testes = carregarAbTests();
  const teste = testes.testes.find(t => t.id === testeId && t.status === 'ativo');
  if (!teste) return null;
  // Alternar entre A e B
  const total = (teste.resultados.A || 0) + (teste.resultados.B || 0);
  return total % 2 === 0 ? 'A' : 'B';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 FUNIL DE CONVERSÃO — UTM PARAMETERS
// Adiciona parâmetros UTM a links para rastrear de onde vem cada clique/download.
const LINKS_BASE = {
  site_ceifalume: 'https://reboclbrank-max.github.io/site/jogos/ceifalume/',
  site_prancheta: 'https://reboclbrank-max.github.io/site/jogos/prancheta/',
  youtube: 'https://www.youtube.com/channel/UCQdxKtfRnqNLd1ZOs9B6eaQ',
};

function linkComUTM(linkBase, fonte, meio, campanha, conteudo = '') {
  const url = new URL(linkBase);
  url.searchParams.set('utm_source', fonte);
  url.searchParams.set('utm_medium', meio);
  url.searchParams.set('utm_campaign', campanha);
  if (conteudo) url.searchParams.set('utm_content', conteudo);
  return url.toString();
}

function linkItchComUTM(jogo, fonte, meio, campanha) {
  const chave = jogo === 'ceifalume' ? 'itch_ceifalume' : 'itch_prancheta';
  return linkComUTM(LINKS_BASE[chave], fonte, meio, campanha);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚨 ALERTA DE QUEDA DE DESEMPENHO
// Detecta métricas em queda e avisa com hipótese do porquê.
const ALERTAS_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(ALERTAS_DIR)) {
  fs.mkdirSync(ALERTAS_DIR, { recursive: true });
}

let historicoMetricas = [];
function carregarHistoricoMetricas() {
  try {
    const arquivo = path.join(ALERTAS_DIR, 'metricas-historico.json');
    if (fs.existsSync(arquivo)) {
      historicoMetricas = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    }
  } catch (e) {}
  return historicoMetricas;
}
function salvarHistoricoMetricas() {
  try {
    fs.writeFileSync(path.join(ALERTAS_DIR, 'metricas-historico.json'), JSON.stringify(historicoMetricas, null, 2), 'utf8');
  } catch (e) {}
}

function registrarMetricaDiaria(servico, metrica, valor) {
  carregarHistoricoMetricas();
  const hoje = new Date().toISOString().slice(0, 10);
  historicoMetricas.push({ servico, metrica, valor, data: hoje });
  // Manter últimos 30 dias
  const corte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  historicoMetricas = historicoMetricas.filter(m => m.data >= corte);
  salvarHistoricoMetricas();
}

function detectarQueda(servico, metrica, dias = 3) {
  carregarHistoricoMetricas();
  const hoje = new Date();
  const valoresRecentes = [];
  for (let i = 0; i < dias; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const dataStr = d.toISOString().slice(0, 10);
    const entrada = historicoMetricas.find(m => m.servico === servico && m.metrica === metrica && m.data === dataStr);
    if (entrada) valoresRecentes.push(entrada.valor);
  }
  if (valoresRecentes.length < 2) return null;
  const primeiro = valoresRecentes[valoresRecentes.length - 1]; // mais antigo
  const ultimo = valoresRecentes[0]; // mais recente
  if (ultimo < primeiro * 0.9) {
    const quedaPct = Math.round(((primeiro - ultimo) / primeiro) * 100);
    return {
      servico,
      metrica,
      quedaPct,
      valorAnterior: primeiro,
      valorAtual: ultimo,
      hipoteses: gerarHipotesesQueda(servico, metrica, quedaPct),
    };
  }
  return null;
}

function gerarHipotesesQueda(servico, metrica, quedaPct) {
  const hipoteses = [];
  hipoteses.push('Conteúdo pode estar repetido — verificar diversificação de formato');
  hipoteses.push('Horário de postagem pode não estar alinhado com pico de acesso');
  if (servico === 'instagram' && metrica === 'seguidores') {
    hipoteses.push('Falta de posts consistentes — verificar agenda de publicação');
    hipoteses.push('Conteúdo visual pode não estar engajando — testar novas imagens');
  }
  if (quedaPct > 30) {
    hipoteses.push('Queda acentuada — revisar urgente a estratégia da rede');
  }
  return hipoteses;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 RECUPERAÇÃO AUTOMÁTICA DE FALHA
// Tenta novamente com backoff exponencial quando uma API falha.
const TENTATIVAS_MAX = 3;
const TEMPOS_RETRY = [60000, 240000, 86400000]; // 1min, 4min, 24h

let estadoRedes = {}; // { servico: { falhasConsecutivas, ultimoErro, proximaTentativa, desabilitadoAte } }

function registrarFalhaRede(servico, erro) {
  if (!estadoRedes[servico]) {
    estadoRedes[servico] = { falhasConsecutivas: 0, ultimoErro: null, proximaTentativa: 0, desabilitadoAte: 0 };
  }
  const estado = estadoRedes[servico];
  estado.falhasConsecutivas++;
  estado.ultimoErro = erro;
  estado.ultimaFalha = new Date().toISOString();

  if (estado.falhasConsecutivas >= TENTATIVAS_MAX) {
    // Desabilitar por 24h
    estado.desabilitadoAte = Date.now() + 24 * 60 * 60 * 1000;
    estado.proximaTentativa = estado.desabilitadoAte;
    registrar('sistema', false, `Rede ${servico} desabilitada por 24h após ${estado.falhasConsecutivas} falhas`);
  } else {
    const atraso = TEMPOS_RETRY[Math.min(estado.falhasConsecutivas - 1, TEMPOS_RETRY.length - 1)];
    estado.proximaTentativa = Date.now() + atraso;
    registrar('sistema', false, `Rede ${servico} falhou (${estado.falhasConsecutivas}/${TENTATIVAS_MAX}), próxima tentativa em ${Math.round(atraso / 60000)} min`);
  }
  return estado;
}

function registrarSucessoRede(servico) {
  if (estadoRedes[servico]) {
    estadoRedes[servico].falhasConsecutivas = 0;
    estadoRedes[servico].proximaTentativa = 0;
    estadoRedes[servico].desabilitadoAte = 0;
  }
}

function redePodeTentar(servico) {
  if (!estadoRedes[servico]) return true;
  const estado = estadoRedes[servico];
  if (estado.desabilitadoAte && Date.now() < estado.desabilitadoAte) return false;
  if (estado.proximaTentativa && Date.now() < estado.proximaTentativa) return false;
  return true;
}

function obterEstadoRedes() {
  return estadoRedes;
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 😊 ANÁLISE DE SENTIMENTO — classificar comentários/respostas
// Ajuda o chat a ajustar o tom do próximo post com base na reação do público.
const PALAVRAS_POSITIVAS = ['ótimo', 'bom', 'legal', 'incrível', 'maravilhoso', 'excelente', 'adorei', 'gostei', 'recomendo', 'baixe', 'joguei', 'testei', 'aprovado', 'top', 'show', 'sensacional', 'fantástico', 'sensacional', 'imperdível', 'vale a pena', 'já baixei', 'já joguei', 'parabéns', 'nota 10'];
const PALAVRAS_NEGATIVAS = ['ruim', 'péssimo', 'horrível', 'odeio', 'não gostei', 'não funciona', 'bug', 'erro', 'falha', 'lixo', 'não baixe', 'não jogue', 'não recomendo', 'decepção', 'perda de tempo', 'travou', 'lag', 'pago', 'cobrança'];

function analisarSentimento(texto) {
  if (!texto) return { sentimento: 'neutro', pontuacao: 0, palavrasEncontradas: [] };
  const lower = texto.toLowerCase();
  let pontos = 0;
  const encontradas = [];
  for (const p of PALAVRAS_POSITIVAS) {
    if (lower.includes(p)) { pontos++; encontradas.push(p); }
  }
  for (const p of PALAVRAS_NEGATIVAS) {
    if (lower.includes(p)) { pontos--; encontradas.push(p); }
  }
  let sentimento = 'neutro';
  if (pontos > 0) sentimento = 'positivo';
  if (pontos < 0) sentimento = 'negativo';
  return { sentimento, pontuacao: pontos, palavrasEncontradas: encontradas };
}

function ajustarTomPorSentimento(sentimentoMedio) {
  if (sentimentoMedio === 'positivo') {
    return { tom: 'entusiasta', sugestao: 'Mantenha a abordagem, use mais CTAs diretos' };
  }
  if (sentimentoMedio === 'negativo') {
    return { tom: 'cauteloso', sugestao: 'Mude a abordagem, foque em benefícios claros, revise o conteúdo' };
  }
  return { tom: 'neutro', sugestao: 'Mantenha equilíbrio, teste novas abordagens' };
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 RELATÓRIO DE DESEMPENHO
// Retorna estatísticas de desempenho por formato e rede.
function relatorioDesempenho() {
  const resultado = {};
  for (const [servico, formatos] of Object.entries(DESEMPENHO_FORMATO)) {
    resultado[servico] = {};
    for (const [formato, stats] of Object.entries(formatos)) {
      resultado[servico][formato] = {
        total: stats.total || 0,
        sucessos: stats.sucessos || 0,
        falhas: (stats.total || 0) - (stats.sucessos || 0),
        zeros: stats.zeros || 0,
        taxaSucesso: stats.total > 0 ? Math.round((stats.sucessos / stats.total) * 100) : 0
      };
    }
  }
  return resultado;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📚 BIBLIOTECA EVERGREEN — conteúdos para republicação
const fsEvergreen = require('fs');
const pathEvergreen = require('path');

const EVERGREEN_DIR = pathEvergreen.join(__dirname, '..', 'posts', 'evergreen');
let cacheEvergreen = null;

function carregarEvergreen() {
  if (cacheEvergreen) return cacheEvergreen;
  try {
    const arquivo = pathEvergreen.join(EVERGREEN_DIR, 'conteudos.json');
    if (fsEvergreen.existsSync(arquivo)) {
      cacheEvergreen = JSON.parse(fsEvergreen.readFileSync(arquivo, 'utf8'));
      return cacheEvergreen;
    }
  } catch (e) {}
  return { categorias: {}, regras: {} };
}

function obterConteudoEvergreen(categoria = 'apresentacao') {
  const lib = carregarEvergreen();
  const conteudos = lib.categorias[categoria] || [];
  if (conteudos.length === 0) return null;
  const idx = Math.floor(Math.random() * conteudos.length);
  return conteudos[idx];
}

function listarCategoriasEvergreen() {
  const lib = carregarEvergreen();
  return Object.keys(lib.categorias || {});
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🤖 AUTORESPOSTAR PARA COMENTÁRIOS COMUNS
const PERGUNTAS_COMUNS = [
  { palavras: ['grátis', 'gratuito', 'pago', 'custa'], resposta: 'Ambos os jogos são totalmente gratuitos! Sem microtransações, sem pay-to-win. 🆓', jogos: ['ceifalume', 'prancheta'] },
  { palavras: ['android', 'celular', 'apk', 'mobile'], resposta: 'Sim, temos versões para Android! Jogue direto no navegador. 📱', jogos: ['ceifalume', 'prancheta'] },
  { palavras: ['jogar', 'como jogar', 'tutorial'], resposta: 'Ceifalume: plante e colha na fazenda noturna. Prancheta: desenhe a bola parada e veja a partida simular. Ambos grátis! 🎮', jogos: ['ceifalume', 'prancheta'] },
  { palavras: ['godot', 'engine', 'feito com'], resposta: 'Feito com Godot Engine, desenvolvido aqui no Brasil. 🇧🇷', jogos: ['ceifalume', 'prancheta'] },
];

function detectarPerguntaComum(texto) {
  if (!texto) return null;
  const lower = texto.toLowerCase();
  for (const p of PERGUNTAS_COMUNS) {
    const todasPalavras = p.palavras.some(w => lower.includes(w));
    if (todasPalavras) {
      return { resposta: p.resposta, jogos: p.jogos, palavras: p.palavras };
    }
  }
  return null;
}

function responderPerguntaComum(servico, idAlvo, textoComentario) {
  const deteccao = detectarPerguntaComum(textoComentario);
  if (!deteccao) return null;
  return deteccao;
}

module.exports = {
  postarGitHub,
  comentarGitHub,
  medirYoutube,
  comentarYoutube,
  curtirYoutube,
  dispararUploadYoutube,
  postarItch,
  criarJogoItch,
  enviarBuildItch,
  enviarBuildItchButler,
  interagirItch,
  postarBluesky,
  interagirBluesky,
  postarMastodon,
  interagirMastodon,
  postarInstagram,
  interagirInstagram,
  postarThreads,
  interagirThreads,
  postarDiscord,
  interagirDiscord,
  postarDevto,
  interagirDevto,
  postarTumblr,
  interagirTumblr,
  postarNostr,
  lerNostr,
  interagirNostr,
  postarX,
  lerX,
  interagirX,
  enviarGmail,
  responderGmail,
  postarTodas,
  relatorio,
  PUBLICACOES,
  validarQualidade,
  registrarDesempenho,
  agendarPublicacao,
  obterProximoFormato,
  relatorioDesempenho,
  salvarBackupPublicacao,
  HISTORICO_FORMATOS,
  DESEMPENHO_FORMATO,
  AGENDA_PUBLICACOES,
  registrarFluxoAcesso,
  melhorHorarioParaPostar,
  proximoJogo,
  getJogoAtual,
  JOGOS_PRIORIDADE,
  FLUXO_ACESSO,

  // Novas funções de marketing inteligente
  validarLink,
  extrairLinks,
  validarLinksDoTexto,
  obterConteudoEvergreen,
  listarCategoriasEvergreen,
  detectarPerguntaComum,
  responderPerguntaComum,
  analisarSentimento,
  ajustarTomPorSentimento,
  criarAbTest,
  registrarResultadoAbTest,
  finalizarAbTest,
  obterVarianteParaPostar,
  linkComUTM,
  linkItchComUTM,
  registrarMetricaDiaria,
  detectarQueda,
  gerarHipotesesQueda,
  registrarFalhaRede,
  registrarSucessoRede,
  redePodeTentar,
  obterEstadoRedes,
};
