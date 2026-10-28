/* Roteador de IA do chat da casa — v2 "cérebro grátis".
   Ordem de ataque: consulta exata (Wikidata, tradução, mathjs) → consenso de 3 modelos → cascata.
   Tudo com R$ 0: nenhuma dessas rotas exige chave.
   Funciona no navegador (window.RoteadorIA) e no Node (module.exports). */
(function (raiz) {
  'use strict';

  var CATALOGO = [
    { id: 'gigante2',  nome: 'Nemotron-3-Ultra-550B (Kilo)',  base: 'https://api.kilo.ai/api/gateway',                          modelo: 'nvidia/nemotron-3-ultra-550b-a55b:free',            classe: 'forte' },
    { id: 'ultra',     nome: 'Nemotron-3-Ultra-550B (g4f)',   base: 'https://nvidia.g4f.dev/v1',                                modelo: 'nvidia/nemotron-3-ultra-550b-a55b',                 classe: 'forte' },
    { id: 'ovhq397',   nome: 'Qwen3.5-397B (OVH)',            base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'Qwen3.5-397B-A17B',                                 classe: 'forte' },
    { id: 'ovhq',      nome: 'Qwen3.6-27B (OVH)',             base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'Qwen3.6-27B',                                       classe: 'forte' },
    { id: 'ovhoss',    nome: 'gpt-oss-120b (OVH)',            base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'gpt-oss-120b',                                      classe: 'forte' },
    { id: 'glm',       nome: 'GLM-5.3 (g4f)',                 base: 'https://nvidia.g4f.dev/v1',                                modelo: 'z-ai/glm-5.3',                                      classe: 'forte' },
    { id: 'g4super',   nome: 'Nemotron-Super-120B (g4f)',     base: 'https://nvidia.g4f.dev/v1',                                modelo: 'nvidia/nemotron-3-super-120b-a12b',                 classe: 'media' },
    { id: 'polli',     nome: 'Pollinations openai-fast',      base: 'https://text.pollinations.ai/openai',                      modelo: 'openai-fast',                                       classe: 'media' },
    { id: 'ovhq38',    nome: 'Qwen3.8-27B (OVH)',             base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'Qwen3.8-27B',                                       classe: 'media' },
    { id: 'kilolight', nome: 'Nemotron-3.5-Lightning (Kilo)', base: 'https://api.kilo.ai/api/gateway',                          modelo: 'nvidia/nemotron-3.5-lightning:free',                classe: 'media' },
    { id: 'lagunas',   nome: 'Laguna-S-2.1 (Kilo)',           base: 'https://api.kilo.ai/api/gateway',                          modelo: 'poolside/laguna-s-2.1:free',                        classe: 'media' },
    { id: 'vlqwen',    nome: 'Qwen2.5-VL-72B (OVH)',          base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'Qwen2.5-VL-72B-Instruct',                           classe: 'media' },
    { id: 'ovhoss20',  nome: 'gpt-oss-20b (OVH)',             base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'gpt-oss-20b',                                       classe: 'leve' },
    { id: 'ovhq9',     nome: 'Qwen3.5-9B (OVH)',              base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'Qwen3.5-9B',                                        classe: 'leve' },
    { id: 'ovhl',      nome: 'Llama-3.3-70B (OVH)',           base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'Meta-Llama-3_3-70B-Instruct',                       classe: 'leve' },
    { id: 'ovhnemo',   nome: 'Mistral-Nemo (OVH)',            base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',          modelo: 'Mistral-Nemo-Instruct-2407',                        classe: 'leve' },
    { id: 'nanoomni',  nome: 'Nano-Omni-30B (Kilo)',          base: 'https://api.kilo.ai/api/gateway',                          modelo: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', classe: 'leve' },
    { id: 'coherecode',nome: 'Cohere-North-Mini (Kilo)',      base: 'https://api.kilo.ai/api/gateway',                          modelo: 'cohere/north-mini-code:free',                       classe: 'leve' }
  ];

  var SYS = 'Responda em uma linha, apenas o resultado pedido. Sem explicação, sem repetir a pergunta.';
  var UA = 'chat-da-casa/2.0 (roteador gratuito)';

  function agora() { return Date.now(); }

  function semAcento(s) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
  function normal(s) {
    return semAcento(s).replace(/[^a-z0-9\s,.-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function Roteador(opcoes) {
    opcoes = opcoes || {};
    this.catalogo = opcoes.catalogo || CATALOGO;
    this.saude = {};
    this.cache = new Map();
    this.cacheMax = opcoes.cacheMax || 400;
    this.cacheTtl = opcoes.cacheTtl || 15 * 60 * 1000;
    this.orcamento = opcoes.orcamento || 110000;
    this.timeoutRota = opcoes.timeoutRota || 25000;
    this.voltasMax = opcoes.voltasMax || 4;
    this.votos = opcoes.votos || 3;              // quantos modelos votam no consenso
    this.ferramentasLigadas = opcoes.ferramentas !== false;
    this.metricas = { perguntas: 0, tentativas: 0, sucessos: 0, falhas: 0, cacheAcertos: 0, ferramenta: 0, consenso: 0, consensoDivergente: 0, porRota: {} };
    var self = this;
    this.catalogo.forEach(function (r) {
      self.saude[r.id] = { ok: 0, falhas: 0, cooldownAte: 0, latMedia: 3000, ultimoErro: null, morta: false };
      self.metricas.porRota[r.id] = { ok: 0, falhas: 0 };
    });
  }

  Roteador.prototype.disponivel = function (id) {
    var s = this.saude[id];
    if (!s || s.morta) return false;
    return agora() >= s.cooldownAte;
  };

  /* ============ CONSULTAS EXATAS (R$ 0, sem LLM) ============ */

  // A Wikimedia exige User-Agent identificável. No navegador o header é proibido,
  // mas o próprio navegador manda um UA real; no Node precisamos declarar.
  function cabecalhosConsulta() {
    var h = { 'Accept': 'application/json' };
    if (typeof window === 'undefined') h['User-Agent'] = UA;
    return h;
  }

  Roteador.prototype._buscarJSON = async function (url, ms) {
    for (var tentativa = 0; tentativa < 3; tentativa++) {
      try {
        var c = new AbortController();
        var t = setTimeout(function () { c.abort(); }, ms || 9000);
        var r = await fetch(url, { signal: c.signal, headers: cabecalhosConsulta() });
        clearTimeout(t);
        if (r.status === 429 || r.status >= 500) { await new Promise(function (x) { setTimeout(x, 900 * Math.pow(2, tentativa)); }); continue; }
        if (!r.ok) return null;
        return await r.json();
      } catch (e) {
        await new Promise(function (x) { setTimeout(x, 250 * (tentativa + 1)); });
      }
    }
    return null;
  };

  Roteador.prototype._mathjs = async function (expr) {
    try {
      var url = 'https://api.mathjs.org/v4/?expr=' + encodeURIComponent(expr);
      var c = new AbortController(); var t = setTimeout(function () { c.abort(); }, 8000);
      var r = await fetch(url, { signal: c.signal });
      clearTimeout(t);
      if (!r.ok) return null;
      var txt = (await r.text()).trim();
      return /^-?[\d.]+$/.test(txt) ? txt : null;
    } catch (e) { return null; }
  };

  // Wikidata: procura a entidade e devolve um valor de propriedade (ex.: P36 capital, P246 símbolo químico)
  Roteador.prototype._qid = async function (termo) {
    if (!this._cacheQid) this._cacheQid = new Map();
    var chave = normal(termo);
    if (this._cacheQid.has(chave)) return this._cacheQid.get(chave);
    var busca = await this._buscarJSON('https://www.wikidata.org/w/api.php?action=wbsearchentities&search=' +
      encodeURIComponent(termo) + '&language=pt&uselang=pt&format=json&limit=1&origin=*');
    var qid = (busca && busca.search && busca.search[0] && busca.search[0].id) || null;
    if (qid) this._cacheQid.set(chave, qid);
    return qid;
  };

  Roteador.prototype._rotulo = async function (qid) {
    if (!this._cacheRotulo) this._cacheRotulo = new Map();
    if (this._cacheRotulo.has(qid)) return this._cacheRotulo.get(qid);
    var alvo = await this._buscarJSON('https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + qid +
      '&props=labels&languages=pt|en&format=json&origin=*');
    var labels = alvo && alvo.entities && alvo.entities[qid] && alvo.entities[qid].labels;
    var nome = (labels && ((labels.pt && labels.pt.value) || (labels.en && labels.en.value))) || null;
    if (nome) this._cacheRotulo.set(qid, nome);
    return nome;
  };

  Roteador.prototype._wikidata = async function (termo, propriedade, rotulo) {
    var qid = await this._qid(termo);
    if (!qid) return null;
    if (!this._cacheClaims) this._cacheClaims = new Map();
    var chavec = qid + ':' + propriedade;
    if (this._cacheClaims.has(chavec)) return this._cacheClaims.get(chavec);
    var ent = await this._buscarJSON('https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + qid +
      '&props=claims&format=json&origin=*');
    var claims = ent && ent.entities && ent.entities[qid] && ent.entities[qid].claims;
    var snak = claims && claims[propriedade] && claims[propriedade][0] && claims[propriedade][0].mainsnak;
    var valor = snak && snak.datavalue && snak.datavalue.value;
    if (!valor) return null;
    var saida = null;
    if (typeof valor === 'string') saida = { valor: valor, fonte: 'wikidata ' + propriedade + '/' + qid };
    else if (valor.id) {
      var nome = await this._rotulo(valor.id);
      if (nome) saida = { valor: nome, fonte: 'wikidata ' + propriedade + '/' + valor.id };
    }
    if (saida) this._cacheClaims.set(chavec, saida);
    return saida;
  };

  var ARTIGOS = /^(o|a|os|as|um|uma|uns|umas|de|do|da|dos|das|em|no|na|nos|nas|the|of|to|in|on|at|a|an)\s+/i;

  Roteador.prototype._traduzir = async function (texto, de, para) {
    var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(texto) + '&langpair=' + de + '|' + para;
    var d = await this._buscarJSON(url, 10000);
    var out = d && d.responseData && d.responseData.translatedText;
    if (!out) return null;
    out = String(out).trim().replace(/[.\u3002]+$/, '');
    if (normal(out) === normal(texto)) return null;          // tradução idêntica = falhou
    // Memória de tradução devolve frase inteira com artigo ("da janela" para "window").
    // Quando a origem é UMA palavra, exigimos no máximo duas palavras e sem artigo/preposição
    // na frente; caso contrário a consulta é descartada e o consenso dos modelos decide.
    var palavrasOrigem = String(texto).trim().split(/\s+/).length;
    var palavrasSaida = out.split(/\s+/).filter(Boolean).length;
    if (palavrasOrigem === 1 && (palavrasSaida > 2 || ARTIGOS.test(out))) return null;
    return { valor: out, fonte: 'mymemory ' + de + '>' + para };
  };

  Roteador.prototype._ferramenta = async function (pergunta) {
    if (!this.ferramentasLigadas) return null;
    var m, p;
    var q = String(pergunta || '').trim();

    /* --- aritmética e porcentagem --- */
    if ((m = q.match(/quanto\s+é\s+([0-9.,\s+\-*/^×÷()%]+)\??$/i))) {
      var expr = m[1].replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.');
      if (/^[\d\s+\-*/^().]+$/.test(expr) && /\d/.test(expr)) {
        var v = await this._mathjs(expr);
        if (v !== null) return { texto: v, ferramenta: 'mathjs', fonte: 'mathjs ' + expr };
      }
    }
    if ((m = q.match(/quanto\s+é\s+(\d+(?:[.,]\d+)?)\s*%\s*de\s*(\d+(?:[.,]\d+)?)/i))) {
      p = parseFloat(m[1].replace(',', '.')); var n = parseFloat(m[2].replace(',', '.'));
      return { texto: String(Math.round(p * n) / 100), ferramenta: 'porcentagem', fonte: 'calculo local' };
    }
    if ((m = q.match(/raiz\s+quadrada\s+de\s+(\d+(?:[.,]\d+)?)/i))) {
      return { texto: String(Math.sqrt(parseFloat(m[1].replace(',', '.')))), ferramenta: 'raiz', fonte: 'calculo local' };
    }
    if ((m = q.match(/metade\s+de\s+(\d+(?:[.,]\d+)?)/i))) {
      return { texto: String(parseFloat(m[1].replace(',', '.')) / 2).replace('.', ','), ferramenta: 'metade', fonte: 'calculo local' };
    }
    if ((m = q.match(/dobro\s+de\s+(\d+(?:[.,]\d+)?)/i))) {
      return { texto: String(parseFloat(m[1].replace(',', '.')) * 2), ferramenta: 'dobro', fonte: 'calculo local' };
    }

    /* --- sequência aritmética/geométrica --- */
    if ((m = q.match(/próximo:\s*([\d,\s]+),\?/i))) {
      var nums = m[1].split(',').map(Number).filter(function (x) { return !isNaN(x); });
      if (nums.length >= 3) {
        var d1 = nums[1] - nums[0], igual = true, k;
        for (k = 2; k < nums.length; k++) if (Math.abs((nums[k] - nums[k - 1]) - d1) > 1e-9) igual = false;
        if (igual) return { texto: String(nums[nums.length - 1] + d1), ferramenta: 'sequencia', fonte: 'calculo local' };
        var r1 = nums[1] / nums[0], geo = nums[0] !== 0;
        for (k = 2; k < nums.length; k++) if (Math.abs(nums[k] / nums[k - 1] - r1) > 1e-9) geo = false;
        if (geo && r1 !== 0) return { texto: String(nums[nums.length - 1] * r1), ferramenta: 'sequencia-geo', fonte: 'calculo local' };
      }
    }

    /* --- tradução (en→pt e pt→en) --- */
    if ((m = q.match(/translate\s+to\s+portuguese:\s*['"“]?(.+?)['"”]?\s*$/i))) {
      var t1 = await this._traduzir(m[1].trim(), 'en', 'pt');
      if (t1) return { texto: t1.valor, ferramenta: 'traducao', fonte: t1.fonte };
    }
    if ((m = q.match(/translate\s+to\s+english:\s*['"“]?(.+?)['"”]?\s*$/i))) {
      var t2 = await this._traduzir(m[1].trim(), 'pt', 'en');
      if (t2) return { texto: t2.valor, ferramenta: 'traducao', fonte: t2.fonte };
    }

    /* --- capital (Wikidata P36) --- */
    if ((m = q.match(/qual\s+(?:é\s+)?a\s+capital\s+d[eo]\s+(.+?)\?*$/i))) {
      var cap = await this._wikidata(m[1].trim(), 'P36', 'capital');
      if (cap) return { texto: cap.valor, ferramenta: 'capital', fonte: cap.fonte };
    }
    /* --- símbolo químico (Wikidata P246) --- */
    if ((m = q.match(/s[ií]mbolo\s+qu[ií]mico\s+d[eo]\s+(.+?)\?*$/i))) {
      var sim = await this._wikidata(m[1].trim(), 'P246', 'símbolo');
      if (sim) return { texto: sim.valor, ferramenta: 'simbolo-quimico', fonte: sim.fonte };
    }
    /* --- unidade no SI (Wikidata P5061) --- */
    if ((m = q.match(/(?:unidade|medida)\s+(?:de|da|do)\s+(.+?)\s+no\s+si\?*$/i))) {
      var uni = await this._wikidata(m[1].trim(), 'P5061', 'unidade');
      if (uni) return { texto: uni.valor, ferramenta: 'unidade-si', fonte: uni.fonte };
    }
    return null;
  };

  /* ============ CACHE ============ */
  Roteador.prototype._cacheGet = function (chave) {
    var e = this.cache.get(chave);
    if (!e) return null;
    if (agora() - e.t > this.cacheTtl) { this.cache.delete(chave); return null; }
    return e.v;
  };
  Roteador.prototype._cacheSet = function (chave, valor) {
    if (this.cache.size >= this.cacheMax) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(chave, { v: valor, t: agora() });
  };

  /* ============ ROTAS ============ */
  Roteador.prototype._candidatos = function (dificuldade) {
    var self = this;
    var ordem = dificuldade === 'leve' ? ['media', 'leve', 'forte'] : ['forte', 'media', 'leve'];
    var lista = [];
    ordem.forEach(function (classe) {
      var grupo = self.catalogo.filter(function (r) { return r.classe === classe; });
      grupo.sort(function (a, b) { return self.saude[a.id].latMedia - self.saude[b.id].latMedia; });
      lista = lista.concat(grupo);
    });
    return lista;
  };

  Roteador.prototype._castigar = function (id, tipo) {
    var s = this.saude[id];
    s.falhas++; s.ultimoErro = tipo;
    s.cooldownAte = agora() + (tipo === 'rate' ? 20000 + Math.random() * 15000
      : tipo === 'morto' ? 30 * 60 * 1000
      : tipo === 'timeout' ? 12000 : 8000);
    if (tipo === 'morto') s.morta = true;
    this.metricas.porRota[id].falhas++;
  };

  Roteador.prototype._premiar = function (id, ms) {
    var s = this.saude[id];
    s.ok++; s.cooldownAte = 0;
    s.latMedia = s.latMedia * 0.7 + ms * 0.3;
    this.metricas.porRota[id].ok++;
  };

  Roteador.prototype._chamar = async function (rota, pergunta, timeoutMs) {
    var url = rota.base.replace(/\/$/, '') + '/chat/completions';
    var c = new AbortController();
    var limite = timeoutMs || this.timeoutRota;
    var t = setTimeout(function () { c.abort(); }, limite);
    var t0 = agora();
    try {
      var r = await fetch(url, {
        method: 'POST', signal: c.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: rota.modelo, temperature: 0, max_tokens: 400,
          messages: [{ role: 'system', content: SYS }, { role: 'user', content: pergunta }]
        })
      });
      clearTimeout(t);
      var bruto = await r.text();
      if (r.status === 429) return { erro: 'rate', ms: agora() - t0 };
      if (r.status === 401 || r.status === 403 || r.status === 404 || r.status === 400) return { erro: 'morto', ms: agora() - t0 };
      if (!r.ok) return { erro: 'servidor', ms: agora() - t0 };
      var d;
      try { d = JSON.parse(bruto); } catch (e) { return { erro: 'servidor', ms: agora() - t0 }; }
      var msg = d.choices && d.choices[0] && d.choices[0].message;
      if (!msg) return { erro: 'servidor', ms: agora() - t0 };
      var texto = (msg.content || '').trim();
      if (!texto && msg.reasoning) texto = String(msg.reasoning).trim();
      if (!texto) return { erro: 'servidor', ms: agora() - t0 };
      return { texto: texto, ms: agora() - t0 };
    } catch (e) {
      clearTimeout(t);
      return { erro: e && e.name === 'AbortError' ? 'timeout' : 'rede', ms: agora() - t0 };
    }
  };

  /* ============ CONSENSO (3 votos) ============ */
  Roteador.prototype._consenso = async function (pergunta, dificuldade) {
    var self = this;
    var candidatos = this._candidatos(dificuldade).filter(function (r) { return self.disponivel(r.id); });
    // um por base, para não votar três vezes no mesmo provedor
    var escolhidos = [], bases = {};
    for (var i = 0; i < candidatos.length && escolhidos.length < this.votos; i++) {
      var b = candidatos[i].base;
      if (bases[b]) continue;
      bases[b] = true; escolhidos.push(candidatos[i]);
    }
    if (!escolhidos.length) return null;

    var respostas = await Promise.all(escolhidos.map(function (rota) {
      return self._chamar(rota, pergunta, 22000).then(function (r) {
        if (r.texto) self._premiar(rota.id, r.ms); else self._castigar(rota.id, r.erro);
        return { rota: rota, texto: r.texto || null, erro: r.erro || null, ms: r.ms };
      });
    }));
    var validas = respostas.filter(function (x) { return x.texto; });
    if (!validas.length) return null;

    // agrupa por resposta normalizada
    var grupos = {};
    validas.forEach(function (x) {
      var k = normal(x.texto).replace(/[.,;:]/g, '');
      if (k.length > 60) k = k.slice(0, 60);
      (grupos[k] = grupos[k] || []).push(x);
    });
    var chaves = Object.keys(grupos).sort(function (a, b) { return grupos[b].length - grupos[a].length; });
    var vencedor = grupos[chaves[0]];
    var empate = chaves.length > 1 && grupos[chaves[1]].length === vencedor.length;
    var melhor = vencedor.slice().sort(function (a, b) {
      var ordem = { forte: 0, media: 1, leve: 2 };
      return ordem[a.rota.classe] - ordem[b.rota.classe];
    })[0];
    this.metricas.consenso++;
    if (chaves.length > 1) this.metricas.consensoDivergente++;
    return {
      texto: melhor.texto,
      rota: melhor.rota.id,
      rotaNome: melhor.rota.nome,
      classe: melhor.rota.classe,
      consenso: vencedor.length + '/' + validas.length,
      confianca: vencedor.length >= 2 && !empate ? 'alta' : (melhor.rota.classe === 'forte' ? 'media' : 'baixa'),
      tentativas: respostas.length,
      ms: Math.max.apply(null, validas.map(function (x) { return x.ms || 0; })),
      votos: validas.map(function (x) { return (x.rota.id + ': ' + String(x.texto).slice(0, 40)); })
    };
  };

  /* ============ API PRINCIPAL ============ */
  Roteador.prototype.responder = async function (pedido) {
    var pergunta = typeof pedido === 'string' ? pedido : pedido.pergunta;
    var dificuldade = (typeof pedido === 'object' && pedido.dificuldade) || 'media';
    var usarFerramenta = !(typeof pedido === 'object' && pedido.semFerramenta);
    var usarConsenso = !(typeof pedido === 'object' && pedido.semConsenso) && dificuldade !== 'leve';
    var chave = 'q:' + normal(pergunta);
    this.metricas.perguntas++;

    var doCache = this._cacheGet(chave);
    if (doCache) { this.metricas.cacheAcertos++; return Object.assign({}, doCache, { cache: true }); }

    if (usarFerramenta) {
      var f = await this._ferramenta(pergunta);
      if (f) {
        var res = { texto: f.texto, rota: f.ferramenta, rotaNome: 'consulta exata · ' + f.ferramenta,
                    classe: 'ferramenta', confianca: 'alta', tentativas: 0, ferramenta: true, ms: 0, fonte: f.fonte };
        this.metricas.ferramenta++;
        this._cacheSet(chave, res);
        return res;
      }
    }

    if (usarConsenso) {
      var c = await this._consenso(pergunta, dificuldade);
      if (c) { this._cacheSet(chave, c); this.metricas.sucessos++; return c; }
    }

    var inicio = agora();
    var tentativas = 0;
    var erroFinal = 'sem rota';
    for (var volta = 0; volta < this.voltasMax; volta++) {
      var eu = this;
      var cands = this._candidatos(dificuldade).filter(function (r) { return eu.disponivel(r.id); });
      if (!cands.length) {
        var t = agora();
        var futuros = this.catalogo.filter(function (r) { return !eu.saude[r.id].morta && eu.saude[r.id].cooldownAte > t; })
          .map(function (r) { return eu.saude[r.id].cooldownAte; });
        var espera = Math.max(400, Math.min((futuros.length ? Math.min.apply(null, futuros) : t) - t, 15000));
        if (agora() - inicio + espera > this.orcamento) break;
        await new Promise(function (r) { setTimeout(r, espera); });
        continue;
      }
      for (var i = 0; i < cands.length; i++) {
        if (agora() - inicio > this.orcamento) break;
        var rota = cands[i];
        tentativas++; this.metricas.tentativas++;
        var r = await this._chamar(rota, pergunta);
        if (r.texto) {
          this._premiar(rota.id, r.ms);
          this.metricas.sucessos++;
          var confianca = rota.classe === 'forte' ? 'alta' : (rota.classe === 'media' ? 'media' : 'baixa');
          var saida = { texto: r.texto, rota: rota.id, rotaNome: rota.nome, classe: rota.classe, confianca: confianca, tentativas: tentativas, ms: r.ms };
          this._cacheSet(chave, saida);
          return saida;
        }
        this._castigar(rota.id, r.erro);
        erroFinal = r.erro;
      }
      var base = 400 * Math.pow(2, volta) + Math.random() * 400;
      if (agora() - inicio + base > this.orcamento) break;
      await new Promise(function (r) { setTimeout(r, base); });
    }
    this.metricas.falhas++;
    return { texto: null, erro: erroFinal, tentativas: tentativas, ms: agora() - inicio };
  };

  Roteador.prototype.estado = function () {
    return { metricas: this.metricas, saude: this.saude,
             catalogo: this.catalogo.map(function (r) { return { id: r.id, nome: r.nome, classe: r.classe }; }) };
  };

  var api = { Roteador: Roteador, CATALOGO: CATALOGO, normal: normal };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  raiz.RoteadorIA = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
