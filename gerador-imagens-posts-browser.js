// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🖼️ GERADOR DE IMAGENS — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function (global) {
  'use strict';

  const CHAVE = 'assistente_rebocl_imagens_v1';

  const ESTILOS = {
    vibrante: 'cores vibrantes, neon, estilo cyberpunk, iluminação dramática',
    minimalista: 'design minimalista, fundo limpo, tipografia moderna, espaço negativo',
    retro: 'estilo retrô anos 80, pixel art, cores pastel, nostalgia gamer',
    epico: 'arte épica, fantasia sombria, iluminação volumosa, detalhes incríveis',
    casual: 'estilo casual, desenho animado, cores alegres, amigável',
  };

  function carregar() {
    try {
      const b = localStorage.getItem(CHAVE);
      if (b) return JSON.parse(b);
    } catch (e) {}
    return { imagens: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  }
  function salvar(c) {
    try {
      c.atualizadoEm = new Date().toISOString();
      localStorage.setItem(CHAVE, JSON.stringify(c));
    } catch (e) {}
  }

  window.__img_gerarPrompt = function (texto, rede, jogo, estilo) {
    const estiloTexto = ESTILOS[estilo] || ESTILOS.vibrante;
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
  };

  window.__img_registrarImagem = function (texto, rede, jogo, prompt, arquivoImagem, estilo) {
    const c = carregar();
    const id = 'img_' + c.proximoId++;
    const imagem = {
      id, texto, rede, jogo: jogo || 'ambos', prompt, arquivoImagem,
      estilo: estilo || 'vibrante', criadoEm: new Date().toISOString(),
      usadoEm: null, resultadoEngajamento: null,
    };
    c.imagens.push(imagem);
    salvar(c);
    return { ok: true, imagem };
  };

  window.__img_listarImagens = function (rede, jogo) {
    const c = carregar();
    let lista = c.imagens;
    if (rede) lista = lista.filter(i => i.rede === rede);
    if (jogo) lista = lista.filter(i => i.jogo === jogo);
    return lista;
  };

  window.__img_marcarUsada = function (id, resultadoEngajamento) {
    const c = carregar();
    const imagem = c.imagens.find(i => i.id === id);
    if (!imagem) return { ok: false, erro: 'Imagem não encontrada' };
    imagem.usadoEm = new Date().toISOString();
    imagem.resultadoEngajamento = resultadoEngajamento;
    salvar(c);
    return { ok: true, imagem };
  };

  window.__img_estatisticas = function () {
    const c = carregar();
    const total = c.imagens.length;
    const usadas = c.imagens.filter(i => i.usadoEm).length;
    const naoUsadas = total - usadas;
    const porRede = {};
    for (const i of c.imagens) {
      if (!porRede[i.rede]) porRede[i.rede] = 0;
      porRede[i.rede]++;
    }
    return { total, usadas, naoUsadas, porRede };
  };

  window.__img_ESTILOS = ESTILOS;

})(typeof globalThis !== 'undefined' ? globalThis : this);