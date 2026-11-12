// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎬 ANÁLISE DE CONTEÚDO DE VÍDEO — desempenho de vídeos
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'conteudo-video.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { videos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarVideo(titulo, rede, jogo, duracao, visualizacoes, curtidas, comentarios, compartilhamentos) {
  const c = carregar();
  const id = 'vid_' + c.proximoId++;
  const eng = Number(curtidas) + Number(comentarios) + Number(compartilhamentos);
  const v = { id, titulo: titulo || '', rede: rede || 'todos', jogo: jogo || 'ambos', duracao: duracao || '', visualizacoes: Number(visualizacoes) || 0, curtidas: Number(curtidas) || 0, comentarios: Number(comentarios) || 0, compartilhamentos: Number(compartilhamentos) || 0, engajamento: eng, taxaEngajamento: Number(visualizacoes) > 0 ? ((eng / Number(visualizacoes)) * 100).toFixed(2) : 0, ativo: true, criadoEm: new Date().toISOString() };
  c.videos.push(v);
  salvar();
  return { ok: true, video: v };
}

function listarVideos(jogo = null, rede = null) {
  const c = carregar();
  let l = c.videos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => b.visualizacoes - a.visualizacoes);
}

function estatisticasConteudoVideo() {
  const c = carregar();
  const total = c.videos.length;
  const totalVisualizacoes = c.videos.reduce((s, v) => s + v.visualizacoes, 0);
  const totalEngajamento = c.videos.reduce((s, v) => s + v.engajamento, 0);
  return { total, totalVisualizacoes, totalEngajamento, ativos: c.videos.filter(x => x.ativo).length };
}

module.exports = { registrarVideo, listarVideos, estatisticasConteudoVideo, carregar, salvar, ARQ };