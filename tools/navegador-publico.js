// Navegador público da casa: abre somente páginas públicas em um Chrome sem perfil,
// sem cookies do dono e sem segredos. Serve para pesquisa/saúde, não para burlar login,
// paywall, CAPTCHA, rede interna ou qualquer área privada.
'use strict';
const dns = require('dns').promises;
const { spawnSync } = require('child_process');

const MAX_HTML = 900000;
const MAX_TEXTO = 1800;
const AGENTE = 'Mozilla/5.0 (X11; Linux x86_64) ReboclNavegadorPublico/1.0';

function ipPrivado(ip) {
  const s = String(ip || '').toLowerCase();
  if (!s) return true;
  if (s.includes(':')) {
    if (s.startsWith('::ffff:')) return ipPrivado(s.slice(7));
    return s === '::1' || s === '::' || s.startsWith('fc') || s.startsWith('fd') ||
      s.startsWith('fe80:') || s.startsWith('fe90:') || s.startsWith('fea0:') || s.startsWith('feb0:');
  }
  const p = s.split('.').map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  return p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 ||
    (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
    (p[0] === 169 && p[1] === 254) || (p[0] === 192 && p[1] === 168) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 198 && (p[1] === 18 || p[1] === 19));
}

function urlPublica(entrada) {
  let u;
  try { u = new URL(String(entrada || '').trim()); } catch (e) { throw new Error('URL inválida'); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('aceito somente http/https');
  if (u.username || u.password) throw new Error('URL com credencial não é permitida');
  if (!u.hostname || /(^|\.)(localhost|local|internal|test)$/i.test(u.hostname)) throw new Error('host local não é permitido');
  if (u.port && u.port !== '80' && u.port !== '443') throw new Error('porta fora do navegador público');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if ((/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) && ipPrivado(host)) throw new Error('endereço privado não é permitido');
  u.hash = '';
  return u;
}

async function confirmaHostPublico(u) {
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) {
    if (ipPrivado(host)) throw new Error('endereço privado não é permitido');
    return [host];
  }
  const ips = await dns.lookup(host, { all: true, verbatim: true });
  if (!ips.length || ips.some(x => ipPrivado(x.address))) throw new Error('host não resolve apenas para IP público');
  return ips.map(x => x.address);
}

function tiraHtml(html) {
  return String(html || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ').trim();
}

function tituloHtml(html) {
  const m = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return tiraHtml(m ? m[1] : '').slice(0, 180);
}

async function corpoLimitado(resposta, maximo = MAX_HTML) {
  const declarado = Number(resposta.headers.get('content-length') || 0);
  if (Number.isFinite(declarado) && declarado > maximo) throw new Error('página pública grande demais para leitura segura');
  if (!resposta.body) return '';
  const leitor = resposta.body.getReader();
  const partes = [];
  let total = 0;
  try {
    while (total < maximo) {
      const bloco = await leitor.read();
      if (bloco.done) break;
      const valor = bloco.value || new Uint8Array();
      const cabe = Math.min(valor.byteLength, maximo - total);
      if (cabe) partes.push(Buffer.from(valor.buffer, valor.byteOffset, cabe));
      total += cabe;
      if (cabe < valor.byteLength) break;
    }
  } finally { try { await leitor.cancel(); } catch (e) {} }
  return Buffer.concat(partes, total).toString('utf8');
}

function chromeDisponivel() {
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const r = spawnSync(bin, ['--version'], { encoding: 'utf8', timeout: 5000 });
    if (!r.error && r.status === 0) return bin;
  }
  return '';
}

function abreComChrome(url) {
  const bin = chromeDisponivel();
  if (!bin) throw new Error('Chrome/Chromium indisponível neste runner');
  const r = spawnSync(bin, [
    '--headless=new', '--incognito', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-extensions', '--disable-background-networking', '--no-first-run',
    '--virtual-time-budget=4000', '--dump-dom', url
  ], { encoding: 'utf8', timeout: 25000, maxBuffer: MAX_HTML + 100000, env: { PATH: process.env.PATH, HOME: process.env.RUNNER_TEMP || '/tmp' } });
  if (r.error || r.status !== 0 || !String(r.stdout || '').trim()) throw new Error('Chrome não conseguiu abrir a página');
  const html = String(r.stdout).slice(0, MAX_HTML);
  return { via: 'chrome', titulo: tituloHtml(html), texto: tiraHtml(html).slice(0, MAX_TEXTO) };
}

async function abreComFetch(url) {
  let atual = url;
  for (let salto = 0; salto < 4; salto++) {
    const u = urlPublica(atual);
    await confirmaHostPublico(u);
    const r = await fetch(u, { redirect: 'manual', headers: { 'User-Agent': AGENTE, Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.1' }, signal: AbortSignal.timeout(20000) });
    if (r.status >= 300 && r.status < 400) {
      const destino = r.headers.get('location');
      if (!destino) throw new Error('redirecionamento sem destino');
      atual = new URL(destino, u).toString();
      continue;
    }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const html = await corpoLimitado(r);
    return { via: 'leitura HTTP', titulo: tituloHtml(html), texto: tiraHtml(html).slice(0, MAX_TEXTO), urlFinal: u.toString() };
  }
  throw new Error('muitos redirecionamentos');
}

async function abrirPagina(entrada, opcoes = {}) {
  const u = urlPublica(entrada);
  await confirmaHostPublico(u);
  let resultado;
  try { resultado = abreComChrome(u.toString()); }
  catch (erroChrome) {
    resultado = await abreComFetch(u.toString());
    resultado.aviso = 'Chrome indisponível/falhou; usei leitura HTTP pública.';
  }
  return {
    url: u.toString(),
    via: resultado.via,
    titulo: resultado.titulo || '(sem título)',
    texto: resultado.texto || '(a página não trouxe texto legível)',
    aviso: resultado.aviso || '',
    consultadoEm: new Date().toISOString()
  };
}

function argumentos(argv) {
  const i = argv.indexOf('--url');
  return i >= 0 ? argv[i + 1] || '' : '';
}

if (require.main === module) {
  const url = argumentos(process.argv.slice(2));
  if (!url) {
    console.error('uso: node tools/navegador-publico.js --url https://exemplo.com');
    process.exitCode = 2;
  } else {
    abrirPagina(url).then(r => console.log(JSON.stringify(r, null, 2))).catch(e => {
      console.error(JSON.stringify({ erro: String(e.message || e) }));
      process.exitCode = 1;
    });
  }
}

module.exports = { ipPrivado, urlPublica, confirmaHostPublico, tiraHtml, tituloHtml, chromeDisponivel, abreComFetch, abrirPagina };
