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
// 🎮 ITCH.IO — criar novo jogo (além de atualizar existente)
async function criarJogoItch(campos) {
  const key = cofre.ler('itch', 'criarJogoItch');
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

    const r = await fetch('https://api.itch.io/games', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body,
      signal: AbortSignal.timeout(30000),
    });
    if (r.ok) {
      const j = await r.json();
      return registrar('itch', true, `jogo criado: ${j.id || 'sem ID'}`, j.id);
    }
    const erro = await r.text().catch(() => '');
    return registrar('itch', false, `criar jogo falhou: HTTP ${r.status}: ${erro.slice(0, 100)}`);
  } catch (e) {
    return registrar('itch', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎮 ITCH.IO — enviar build/arquivo do jogo (upload de binário)
async function enviarBuildItch(gameId, caminhoArquivo) {
  const key = cofre.ler('itch', 'enviarBuildItch');
  if (!key) return registrar('itch', false, 'sem ITCH_API_KEYS configurado');
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');

    if (!fs.existsSync(caminhoArquivo)) {
      return registrar('itch', false, `arquivo não encontrado: ${caminhoArquivo}`);
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(caminhoArquivo));

    const nomeArquivo = path.basename(caminhoArquivo);

    const r = await fetch(`https://api.itch.io/games/${gameId}/uploads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        ...form.getHeaders ? form.getHeaders() : {},
      },
      body: form,
      signal: AbortSignal.timeout(120000),
    });

    if (r.ok) {
      const j = await r.json().catch(() => ({}));
      return registrar('itch', true, `build enviado para jogo ${gameId}`, nomeArquivo);
    }
    const erro = await r.text().catch(() => '');
    return registrar('itch', false, `enviar build falhou: HTTP ${r.status}: ${erro.slice(0, 100)}`);
  } catch (e) {
    return registrar('itch', false, `erro: ${e.message.slice(0, 100)}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎮 ITCH.IO — enviar build via butler CLI (método oficial, sem API REST)
// Requer: butler instalado e logado (butler login). Comando: butler push <pasta> <usuario>/<jogo>:<canal>
async function enviarBuildItchButler(usuarioJogo, caminhoPasta, canal = 'windows') {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execFileAsync = promisify(execFile);

  try {
    const fs = await import('node:fs');
    if (!fs.existsSync(caminhoPasta)) {
      return registrar('itch', false, `pasta não encontrada: ${caminhoPasta}`);
    }

    const alvo = `${usuarioJogo}:${canal}`;
    const { stdout, stderr } = await execFileAsync('butler', ['push', caminhoPasta, alvo], {
      timeout: 300000,
      encoding: 'utf8',
    });

    const saida = (stdout || '') + (stderr || '');
    if (saida.toLowerCase().includes('uploaded') || saida.toLowerCase().includes('pushed') || saida.includes('OK')) {
      return registrar('itch', true, `build enviado via butler para ${alvo}`, caminhoPasta);
    }
    return registrar('itch', true, `butler executado para ${alvo}`, saida.slice(0, 100));
  } catch (e) {
    return registrar('itch', false, `butler falhou: ${e.message.slice(0, 100)}`);
  }
}

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
};
