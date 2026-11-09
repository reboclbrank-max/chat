// 📱 REDES SOCIAIS — postagem unificada em todas as plataformas
// v1 (09/11/2026): cada rede tem suas funções de POSTAR e MEDIR.
// Todas as chamadas usam o cofre seguro (cofre-seguro.js) para credenciais.
// Nenhuma credencial entra em texto claro no log.
// Regras: (1) só posta se a credencial estiver configurada;
// (2) recusa com motivo e números se não estiver;
// (3) falha nunca vira sucesso;
// (4) toda publicação registra resultado (sucesso ou falha).

const cofre = require('./cofre-seguro');
const NL = '\n';

const PUBLICACOES = []; // { servico, quando, sucesso, detalhe, idPublicacao }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: registro de publicação
function registrar(servico, sucesso, detalhe, idPub) {
  PUBLICACOES.push({
    servico,
    quando: new Date().toISOString(),
    sucesso,
    detalhe,
    idPublicacao: idPub || null,
  });
  return { sucesso, servico, detalhe, idPublicacao: idPub || null };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🐙 GITHUB — criar issue/discussion (leitura + escrita via PAT)
async function postarGitHub(texto, titulo) {
  const token = cofre.ler('github', 'postarGitHub');
  if (!token) return registrar('github', false, 'sem GITHUB_TOKEN configurado');
  try {
    const corpo = { title: titulo || 'Post da casa', body: texto };
    const r = await fetch('https://api.github.com/repos/reboclbrank-max/site/issues', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'rebocl-casa/1',
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(30000),
    });
    if (r.ok) {
      const j = await r.json();
      return registrar('github', true, 'issue criado', j.number);
    }
    const erro = await r.text().catch(() => '');
    return registrar('github', false, `HTTP ${r.status}: ${erro.slice(0, 100)}`);
  } catch (e) {
    return registrar('github', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📺 YOUTUBE — métricas (somente leitura com API key; upload exige OAuth do dono)
async function medirYoutube() {
  const key = cofre.ler('youtube', 'medirYoutube');
  if (!key) return registrar('youtube', false, 'sem YT_API_KEY configurado');
  try {
    const r = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&id=UCQdxKtfRnqNLd1ZOs9B6eaQ&key=${key}`,
      { signal: AbortSignal.timeout(30000) }
    );
    if (!r.ok) return registrar('youtube', false, `HTTP ${r.status}`);
    const j = await r.json();
    if (!j.items || !j.items[0]) return registrar('youtube', false, 'canal não encontrado');
    const s = j.items[0].statistics;
    return registrar('youtube', true, `inscritos=${s.subscriberCount}, vídeos=${s.videoCount}, visualizações=${s.viewCount}`);
  } catch (e) {
    return registrar('youtube', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📺 YOUTUBE — dispara upload de vídeo no repo site (segredos OAuth já configurados lá)
// O chat não precisa ter YT_CLIENT_ID/SECRET/REFRESH_TOKEN: dispara o workflow
// enviar-youtube.yml do repositorio site, que ja possui esses segredos.
async function dispararUploadYoutube(jogo = 'ceifalume') {
  const pat = cofre.ler('github', 'dispararUploadYoutube');
  if (!pat) return registrar('youtube', false, 'sem GITHUB_TOKEN para disparar workflow');
  try {
    const r = await fetch('https://api.github.com/repos/reboclbrank-max/site/actions/workflows/enviar-youtube.yml/dispatches', {
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
          jogo: jogo,
          confirmacao: 'PUBLICAR',
        },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (r.status === 204) {
      return registrar('youtube', true, 'workflow de envio disparado no repo site', jogo);
    }
    const erro = await r.text().catch(() => '');
    return registrar('youtube', false, `workflow dispatch falhou: HTTP ${r.status}: ${erro.slice(0, 100)}`);
  } catch (e) {
    return registrar('youtube', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎮 ITCH.IO — atualizar jogo (título, descrição, tags)
async function postarItch(gameId, campos) {
  const key = cofre.ler('itch', 'postarItch');
  if (!key) return registrar('itch', false, 'sem ITCH_API_KEYS configurado');
  try {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(campos || {})) body.append(`game[${k}]`, v);
    body.append('slug', campos.slug || '');
    body.append('published', campos.published || 'draft');
    body.append('payment_mode', campos.payment_mode || 'free');
    body.append('type', campos.type || 'default');
    body.append('user_classification', campos.user_classification || 'game');
    body.append('release_status', campos.release_status || 'released');
    body.append('community_type', campos.community_type || 'steam');
    body.append('min_price', campos.min_price || '0');

    const r = await fetch(`https://api.itch.io/games/${gameId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body,
      signal: AbortSignal.timeout(30000),
    });
    if (r.ok) return registrar('itch', true, `jogo ${gameId} atualizado`);
    const erro = await r.text().catch(() => '');
    return registrar('itch', false, `HTTP ${r.status}: ${erro.slice(0, 100)}`);
  } catch (e) {
    return registrar('itch', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🦋 BLUESKY — postar texto + imagem (até 1 MB)
async function postarBluesky(texto, imagemB64, nomeImagem) {
  const handle = cofre.ler('bluesky_handle', 'postarBluesky');
  const senha = cofre.ler('bluesky_pass', 'postarBluesky') || cofre.ler('bluesky_pass_alt', 'postarBluesky');
  if (!handle || !senha) return registrar('bluesky', false, 'sem BLUESKY_HANDLE ou BLUESKY_APPPASS configurado');
  try {
    // Login
    const login = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: handle, password: senha }),
      signal: AbortSignal.timeout(30000),
    });
    if (!login.ok) return registrar('bluesky', false, `login falhou: HTTP ${login.status}`);
    const j = await login.json();
    const accessJwt = j.accessJwt;

    let blobRef = null;
    if (imagemB64) {
      const upload = await fetch('https://bsky.social/xrpc/com.atproto.repo.uploadBlob', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessJwt}`,
          'Content-Type': 'image/jpeg',
        },
        body: Buffer.from(imagemB64, 'base64'),
        signal: AbortSignal.timeout(60000),
      });
      if (!upload.ok) return registrar('bluesky', false, `upload imagem falhou: HTTP ${upload.status}`);
      const uj = await upload.json();
      blobRef = uj.blob;
    }

    const registro = {
      $type: 'app.bsky.feed.post',
      text: texto.slice(0, 300),
      createdAt: new Date().toISOString(),
    };
    if (blobRef) {
      registro.embed = {
        $type: 'app.bsky.embed.images',
        images: [{ image: blobRef, alt: nomeImagem || 'imagem' }],
      };
    }

    const post = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repo: j.did,
        collection: 'app.bsky.feed.post',
        record: registro,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!post.ok) {
      const erro = await post.text().catch(() => '');
      return registrar('bluesky', false, `post falhou: HTTP ${post.status}: ${erro.slice(0, 100)}`);
    }
    const pj = await post.json();
    return registrar('bluesky', true, 'post publicado', pj.uri);
  } catch (e) {
    return registrar('bluesky', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🐘 MASTODON — postar texto + mídia
async function postarMastodon(texto, imagemB64, nomeArquivo, tipoMime) {
  const token = cofre.ler('mastodon', 'postarMastodon');
  if (!token) return registrar('mastodon', false, 'sem MASTODON_TOKEN configurado');
  try {
    let mediaId = null;
    if (imagemB64) {
      const form = new FormData();
      form.append('file', Buffer.from(imagemB64, 'base64'), nomeArquivo || 'imagem');
      const up = await fetch('https://mastodon.social/api/v2/media', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: AbortSignal.timeout(60000),
      });
      if (!up.ok) return registrar('mastodon', false, `upload mídia falhou: HTTP ${up.status}`);
      const uj = await up.json();
      mediaId = uj.id;
    }

    const body = { status: texto.slice(0, 500), language: 'pt' };
    if (mediaId) body.media_ids = [mediaId];

    const r = await fetch('https://mastodon.social/api/v1/statuses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) {
      const erro = await r.text().catch(() => '');
      return registrar('mastodon', false, `post falhou: HTTP ${r.status}: ${erro.slice(0, 100)}`);
    }
    const j = await r.json();
    return registrar('mastodon', true, 'post publicado', j.id);
  } catch (e) {
    return registrar('mastodon', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📸 INSTAGRAM — publicar (exige token de longa duração renovado a cada 60 dias)
async function postarInstagram(texto, urlImagem) {
  const token = cofre.ler('instagram', 'postarInstagram');
  if (!token) return registrar('instagram', false, 'sem IG_TOKEN configurado');
  try {
    // Criar container de mídia
    const container = await fetch(
      `https://graph.instagram.com/v21.0/me/media?image_url=${encodeURIComponent(urlImagem)}&caption=${encodeURIComponent(texto.slice(0, 2200))}&access_token=${token}`,
      { method: 'POST', signal: AbortSignal.timeout(30000) }
    );
    if (!container.ok) {
      const erro = await container.text().catch(() => '');
      return registrar('instagram', false, `container falhou: HTTP ${container.status}: ${erro.slice(0, 100)}`);
    }
    const cj = await container.json();
    const creationId = cj.id;

    // Publicar
    const publicar = await fetch(
      `https://graph.instagram.com/v21.0/me/media_publish?creation_id=${creationId}&access_token=${token}`,
      { method: 'POST', signal: AbortSignal.timeout(30000) }
    );
    if (!publicar.ok) {
      const erro = await publicar.text().catch(() => '');
      return registrar('instagram', false, `publicar falhou: HTTP ${publicar.status}: ${erro.slice(0, 100)}`);
    }
    const pj = await publicar.json();
    return registrar('instagram', true, 'post publicado', pj.id);
  } catch (e) {
    return registrar('instagram', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧵 THREADS — postar texto + imagem
async function postarThreads(texto, urlImagem) {
  const token = cofre.ler('threads', 'postarThreads') || cofre.ler('threads_alt', 'postarThreads');
  if (!token) return registrar('threads', false, 'sem THREADS_TOKEN configurado');
  try {
    // Primeiro precisa do user_id
    const me = await fetch(`https://graph.threads.net/v1.0/me?fields=id&access_token=${token}`, {
      signal: AbortSignal.timeout(30000),
    });
    if (!me.ok) return registrar('threads', false, `me falhou: HTTP ${me.status}`);
    const mj = await me.json();
    const userId = mj.id;

    // Criar container
    const corpo = new URLSearchParams();
    corpo.append('media_type', urlImagem ? 'IMAGE' : 'TEXT');
    corpo.append('text', texto.slice(0, 500));
    if (urlImagem) corpo.append('image_url', urlImagem);

    const container = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: corpo,
      signal: AbortSignal.timeout(30000),
    });
    if (!container.ok) {
      const erro = await container.text().catch(() => '');
      return registrar('threads', false, `container falhou: HTTP ${container.status}: ${erro.slice(0, 100)}`);
    }
    const cj = await container.json();
    const creationId = cj.id;

    // Aguardar finish e publicar
    await new Promise((r) => setTimeout(r, 5000));
    const status = await fetch(`https://graph.threads.net/v1.0/${creationId}?fields=status&access_token=${token}`, {
      signal: AbortSignal.timeout(30000),
    });
    const sj = await status.json();
    if (sj.status !== 'FINISHED') return registrar('threads', false, `container não finalizou: status=${sj.status}`);

    const publicar = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish?creation_id=${creationId}&access_token=${token}`, {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
    });
    if (!publicar.ok) {
      const erro = await publicar.text().catch(() => '');
      return registrar('threads', false, `publicar falhou: HTTP ${publicar.status}: ${erro.slice(0, 100)}`);
    }
    const pj = await publicar.json();
    return registrar('threads', true, 'post publicado', pj.id);
  } catch (e) {
    return registrar('threads', false, `erro: ${e.message.slice(0, 100)}`);
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 POSTAR EM TODAS AS REDES DISPONÍVEI
// Posta o mesmo conteúdo em todas as redes que tiverem credencial configurada.
// Retorna resultados de cada rede.
async function postarTodas(texto, opcoes = {}) {
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

  // GitHub (issue)
  resultados.push(await postarGitHub(texto, titulo));

  // YouTube (apenas medição, não postagem)
  resultados.push(await medirYoutube());

  // itch.io
  if (gameIdItch) {
    resultados.push(await postarItch(gameIdItch, camposItch || {}));
  }

  // Bluesky
  resultados.push(await postarBluesky(texto, imagemB64, nomeImagem));

  // Mastodon
  resultados.push(await postarMastodon(texto, imagemB64, nomeImagem, 'image/jpeg'));

  // Instagram (precisa de URL externa da imagem)
  if (urlImagem) {
    resultados.push(await postarInstagram(texto, urlImagem));
  }

  // Threads (precisa de URL externa da imagem)
  if (urlImagem) {
    resultados.push(await postarThreads(texto, urlImagem));
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

module.exports = {
  postarGitHub,
  medirYoutube,
  dispararUploadYoutube,
  postarItch,
  postarBluesky,
  postarMastodon,
  postarInstagram,
  postarThreads,
  postarDiscord,
  postarDevto,
  postarTumblr,
  postarNostr,
  enviarGmail,
  postarTodas,
  relatorio,
  PUBLICACOES,
};
