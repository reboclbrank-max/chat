// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🖼️ GERADOR DE IMAGENS PARA POSTS
// Gera prompts e registra imagens criadas para divulgação dos jogos.
// Só serve marketing de Prancheta e Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
const IMAGENS_DIR = path.join(MARKETING_DIR, 'imagens');
if (!fs.existsSync(MARKETING_DIR)) {
  fs.mkdirSync(MARKETING_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGENS_DIR)) {
  fs.mkdirSync(IMAGENS_DIR, { recursive: true });
}

const ARQUIVO_IMAGENS = path.join(MARKETING_DIR, 'imagens-posts.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try {
    if (fs.existsSync(ARQUIVO_IMAGENS)) {
      cache = JSON.parse(fs.readFileSync(ARQUIVO_IMAGENS, 'utf8'));
      return cache;
    }
  } catch (e) {}
  cache = {
    imagens: [],
    proximoId: 1,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
  return cache;
}
function salvar() {
  try {
    cache.atualizadoEm = new Date().toISOString();
    fs.writeFileSync(ARQUIVO_IMAGENS, JSON.stringify(cache, null, 2), 'utf8');
  } catch (e) {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GERAR PROMPT DE IMAGEM
// Cria um prompt otimizado para geração de imagem de divulgação de jogo
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function gerarPrompt(texto, rede, jogo, estilo = 'vibrante') {
  const estilos = {
    vibrante: 'cores vibrantes, neon, estilo cyberpunk, iluminação dramática',
    minimalista: 'design minimalista, fundo limpo, tipografia moderna, espaço negativo',
    retro: 'estilo retrô anos 80, pixel art, cores pastel, nostalgia gamer',
    epico: 'arte épica, fantasia sombria, iluminação volumosa, detalhes incríveis',
    casual: 'estilo casual, desenho animado, cores alegres, amigável',
  };
  const estiloTexto = estilos[estilo] || estilos.vibrante;

  const jogoContexto = jogo === 'ceifalume'
    ? 'jogo de terror psicológico, atmosfera sombria, lanterna, névoa, silhueta ameaçadora'
    : jogo === 'prancheta'
      ? 'jogo de desenho criativo, prancheta, lápis, cores vivas, criatividade, arte'
      : 'jogo indie, estilo único, atmosfera envolvente';

  const redeContexto = rede === 'instagram'
    ? 'formato quadrado 1:1, ideal para Instagram, visual impactante'
    : rede === 'x'
      ? 'formato retângulo horizontal, ideal para X/Twitter, texto legível em tamanho pequeno'
      : rede === 'nostr'
        ? 'formato versátil, ideal para Nostr, visual limpo'
        : 'formato versátil para redes sociais';

  return `Imagem de divulgação para jogo indie "${jogoContexto}". ${texto}. ${estiloTexto}. ${redeContexto}. Alta resolução, qualidade profissional, pronto para redes sociais.`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REGISTRAR IMAGEM CRIADA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function registrarImagem(texto, rede, jogo, prompt, arquivoImagem, estilo) {
  const c = carregar();
  const id = 'img_' + c.proximoId++;
  const imagem = {
    id,
    texto,
    rede,
    jogo: jogo || 'ambos',
    prompt,
    arquivoImagem,
    estilo: estilo || 'vibrante',
    criadoEm: new Date().toISOString(),
    usadoEm: null,
    resultadoEngajamento: null,
  };
  c.imagens.push(imagem);
  salvar();
  return { ok: true, imagem };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LISTAR IMAGENS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function listarImagens(rede = null, jogo = null) {
  const c = carregar();
  let lista = c.imagens;
  if (rede) lista = lista.filter(i => i.rede === rede);
  if (jogo) lista = lista.filter(i => i.jogo === jogo);
  return lista;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARCAR COMO USADA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function marcarUsada(id, resultadoEngajamento = null) {
  const c = carregar();
  const imagem = c.imagens.find(i => i.id === id);
  if (!imagem) return { ok: false, erro: 'Imagem não encontrada' };
  imagem.usadoEm = new Date().toISOString();
  imagem.resultadoEngajamento = resultadoEngajamento;
  salvar();
  return { ok: true, imagem };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ESTATÍSTICAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function estatisticas() {
  const c = carregar();
  const total = c.imagens.length;
  const usadas = c.imagens.filter(i => i.usadoEm).length;
  const naoUsadas = c.imagens.filter(i => !i.usadoEm).length;
  const porRede = {};
  for (const i of c.imagens) {
    if (!porRede[i.rede]) porRede[i.rede] = 0;
    porRede[i.rede]++;
  }
  return { total, usadas, naoUsadas, porRede };
}

module.exports = {
  gerarPrompt,
  registrarImagem,
  listarImagens,
  marcarUsada,
  estatisticas,
  carregar,
  salvar,
  IMAGENS_DIR,
  ARQUIVO_IMAGENS,
};