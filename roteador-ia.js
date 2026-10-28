/* Roteador de IA do chat da casa — disponibilidade > esperteza de uma rota só.
   Regras: ferramenta primeiro (aritmética exata), cache, cascata por qualidade,
   backoff com jitter, disjuntor por rota, orçamento de tempo total.
   Funciona no navegador (window.RoteadorIA) e no Node (module.exports). */
(function (raiz) {
  'use strict';

  // classes: forte (modelos maiores) / media / leve (rápidos e pequenos)
  var CATALOGO = [
    { id: 'gigante2',  nome: 'Nemotron-3-Ultra-550B (Kilo)',  base: 'https://api.kilo.ai/api/gateway',                        modelo: 'nvidia/nemotron-3-ultra-550b-a55b:free',            classe: 'forte' },
    { id: 'ultra',     nome: 'Nemotron-3-Ultra-550B (g4f)',   base: 'https://nvidia.g4f.dev/v1',                              modelo: 'nvidia/nemotron-3-ultra-550b-a55b',                 classe: 'forte' },
    { id: 'ovhq397',   nome: 'Qwen3.5-397B (OVH)',            base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',        modelo: 'Qwen3.5-397B-A17B',                                 classe: 'forte' },
    { id: 'ovhq',      nome: 'Qwen3.6-27B (OVH)',             base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',        modelo: 'Qwen3.6-27B',                                       classe: 'forte' },
    { id: 'ovhoss',    nome: 'gpt-oss-120b (OVH)',            base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',        modelo: 'gpt-oss-120b',                                      classe: 'forte' },
    { id: 'glm',       nome: 'GLM-5.3 (g4f)',                 base: 'https://nvidia.g4f.dev/v1',                              modelo: 'z-ai/glm-5.3',                                      classe: 'forte' },
    { id: 'g4super',   nome: 'Nemotron-Super-120B (g4f)',     base: 'https://nvidia.g4f.dev/v1',                              modelo: 'nvidia/nemotron-3-super-120b-a12b',                 classe: 'media' },
    { id: 'polli',     nome: 'Pollinations openai-fast',      base: 'https://text.pollinations.ai/openai',                    modelo: 'openai-fast',                                       classe: 'media' },
    { id: 'ovhq38',    nome: 'Qwen3.8-27B (OVH)',             base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',        modelo: 'Qwen3.8-27B',                                       classe: 'media' },
    { id: 'kilolight', nome: 'Nemotron-3.5-Lightning (Kilo)', base: 'https://api.kilo.ai/api/gateway',                        modelo: 'nvidia/nemotron-3.5-lightning:free',                classe: 'media' },
    { id: 'lagunas',   nome: 'Laguna-S-2.1 (Kilo)',           base: 'https://api.kilo.ai/api/gateway',                        modelo: 'poolside/laguna-s-2.1:free',                        classe: 'media' },
    { id: 'vlqwen',    nome: 'Qwen2.5-VL-72B (OVH)',          base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',        modelo: 'Qwen2.5-VL-72B-Instruct',                           classe: 'media' },
    { id: 'ovhoss20',  nome: 'gpt-oss-20b (OVH)',             base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',        modelo: 'gpt-oss-20b',                                       classe: 'leve' },
    { id: 'ovhq9',     nome: 'Qwen3.5-9B (OVH)',              base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',        modelo: 'Qwen3.5-9B',                                        classe: 'leve' },
    { id: 'ovhl',      nome: 'Llama-3.3-70B (OVH)',           base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',        modelo: 'Meta-Llama-3_3-70B-Instruct',                       classe: 'leve' },
    { id: 'ovhnemo',   nome: 'Mistral-Nemo (OVH)',            base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',        modelo: 'Mistral-Nemo-Instruct-2407',                        classe: 'leve' },
    { id: 'nanoomni',  nome: 'Nano-Omni-30B (Kilo)',          base: 'https://api.kilo.ai/api/gateway',                        modelo: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', classe: 'leve' },
    { id: 'coherecode',nome: 'Cohere-North-Mini (Kilo)',      base: 'https://api.kilo.ai/api/gateway',                        modelo: 'cohere/north-mini-code:free',                       classe: 'leve' }
  ];

  var SYS = 'Responda em uma linha, apenas o resultado pedido. Sem explicação, sem repetir a pergunta.';

  function agora() { return Date.now(); }

  function Roteador(opcoes) {
    opcoes = opcoes || {};
    this.catalogo = opcoes.catalogo || CATALOGO;
    this.saude = {};
    this.cache = new Map();
    this.cacheMax = opcoes.cacheMax || 300;
    this.cacheTtl = opcoes.cacheTtl || 10 * 60 * 1000;
    this.orcamento = opcoes.orcamento || 110000;      // tempo total por pergunta
    this.timeoutRota = opcoes.timeoutRota || 25000;  // por tentativa
    this.voltasMax = opcoes.voltasMax || 4;
    this.metricas = { perguntas: 0, tentativas: 0, sucessos: 0, falhas: 0, cacheAcertos: 0, ferramenta: 0, porRota: {} };
    var self = this;
    this.catalogo.forEach(function (r) {
      self.saude[r.id] = { ok: 0, falhas: 0, cooldownAte: 0, latMedia: 3000, ultimoErro: null, morta: false };
      self.metricas.porRota[r.id] = { ok: 0, falhas: 0 };
    });
  }

  Roteador.prototype._saude = function (id) { return this.saude[id]; };

  Roteador.prototype.disponivel = function (id) {
    var s = this.saude[id];
    if (!s || s.morta) return false;
    return agora() >= s.cooldownAte;
  };

  /* ------- ferramentas determinísticas (não gastam LLM) ------- */
  Roteador.prototype._ferramenta = async function (pergunta) {
    var m;
    // aritmética pura: "Quanto é 17+26?", "Quanto é 15% de 80?", "Quanto é 2^10?"
    if ((m = pergunta.match(/quanto\s+é\s+([0-9.,\s+\-*/^×÷()%]+)\??$/i))) {
      var expr = m[1].replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.');
      if (/^[\d\s+\-*/^().]+$/.test(expr) && /\d/.test(expr)) {
        var v = await this._mathjs(expr);
        if (v !== null) return { texto: v, ferramenta: 'mathjs', expressao: expr };
      }
    }
    if ((m = pergunta.match(/quanto\s+é\s+(\d+(?:[.,]\d+)?)\s*%\s*de\s*(\d+(?:[.,]\d+)?)/i))) {
      var p = parseFloat(m[1].replace(',', '.')), n = parseFloat(m[2].replace(',', '.'));
      return { texto: String(Math.round(p * n) / 100), ferramenta: 'porcentagem' };
    }
    if ((m = pergunta.match(/raiz\s+quadrada\s+de\s+(\d+(?:[.,]\d+)?)/i))) {
      return { texto: String(Math.sqrt(parseFloat(m[1].replace(',', '.')))), ferramenta: 'raiz' };
    }
    if ((m = pergunta.match(/metade\s+de\s+(\d+(?:[.,]\d+)?)/i))) {
      return { texto: String(parseFloat(m[1].replace(',', '.')) / 2).replace('.', ','), ferramenta: 'metade' };
    }
    if ((m = pergunta.match(/dobro\s+de\s+(\d+(?:[.,]\d+)?)/i))) {
      return { texto: String(parseFloat(m[1].replace(',', '.')) * 2), ferramenta: 'dobro' };
    }
    // sequência aritmética simples: "Próximo: 2,5,8,11,14,?" — calcula a razão
    if ((m = pergunta.match(/próximo:\s*([\d,\s]+),\?/i))) {
      var nums = m[1].split(',').map(function (x) { return parseFloat(x); }).filter(function (x) { return !isNaN(x); });
      if (nums.length >= 3) {
        var d = nums[1] - nums[0], igual = true, k;
        for (k = 2; k < nums.length; k++) if (Math.abs((nums[k] - nums[k - 1]) - d) > 1e-9) igual = false;
        if (igual) return { texto: String(nums[nums.length - 1] + d), ferramenta: 'sequencia' };
        var q = nums[1] / nums[0], geo = nums[0] !== 0;
        for (k = 2; k < nums.length; k++) if (Math.abs(nums[k] / nums[k - 1] - q) > 1e-9) geo = false;
        if (geo && q !== 0) return { texto: String(nums[nums.length - 1] * q), ferramenta: 'sequencia-geo' };
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

  /* ------- cache ------- */
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

  /* ------- ordem dos candidatos ------- */
  Roteador.prototype._candidatos = function (dificuldade) {
    var self = this;
    var ordem = dificuldade === 'dificil' ? ['forte', 'media', 'leve']
               : dificuldade === 'leve'   ? ['media', 'leve', 'forte']
               : ['forte', 'media', 'leve'];
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
    s.falhas++;
    s.ultimoErro = tipo;
    var espera = tipo === 'rate' ? 20000 + Math.random() * 15000
               : tipo === 'morto' ? 30 * 60 * 1000
               : tipo === 'timeout' ? 12000
               : 8000;
    s.cooldownAte = agora() + espera;
    if (tipo === 'morto') s.morta = true;
    this.metricas.porRota[id].falhas++;
  };

  Roteador.prototype._premiar = function (id, ms) {
    var s = this.saude[id];
    s.ok++; s.cooldownAte = 0;
    s.latMedia = s.latMedia * 0.7 + ms * 0.3;
    this.metricas.porRota[id].ok++;
  };

  Roteador.prototype._chamar = async function (rota, pergunta) {
    var url = rota.base.replace(/\/$/, '') + '/chat/completions';
    var c = new AbortController();
    var t = setTimeout(function () { c.abort(); }, this.timeoutRota);
    var t0 = agora();
    try {
      var r = await fetch(url, {
        method: 'POST', signal: c.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: rota.modelo, temperature: 0, max_tokens: 400,
          messages: [{ role: 'system', content: SYS }, { role: 'user', content: pergunta }]
        })
      });
      clearTimeout(t);
      var bruto = await r.text();
      if (r.status === 429) return { erro: 'rate', ms: agora() - t0 };
      if (r.status === 401 || r.status === 403 || r.status === 404 || r.status === 400) return { erro: 'morto', ms: agora() - t0, detalhe: bruto.slice(0, 80) };
      if (!r.ok) return { erro: 'servidor', ms: agora() - t0 };
      var d;
      try { d = JSON.parse(bruto); } catch (e) { return { erro: 'servidor', ms: agora() - t0 }; }
      var msg = d.choices && d.choices[0] && d.choices[0].message;
      if (!msg) return { erro: 'servidor', ms: agora() - t0 };
      var texto = (msg.content || '').trim();
      if (!texto && msg.reasoning) texto = String(msg.reasoning).trim();  // modelos que só devolvem raciocínio
      if (!texto) return { erro: 'servidor', ms: agora() - t0 };
      return { texto: texto, ms: agora() - t0 };
    } catch (e) {
      clearTimeout(t);
      return { erro: e && e.name === 'AbortError' ? 'timeout' : 'rede', ms: agora() - t0 };
    }
  };

  /* ------- API principal ------- */
  Roteador.prototype.responder = async function (pedido) {
    var pergunta = typeof pedido === 'string' ? pedido : pedido.pergunta;
    var dificuldade = (typeof pedido === 'object' && pedido.dificuldade) || 'media';
    var usarFerramenta = !(typeof pedido === 'object' && pedido.semFerramenta);
    var chave = 'q:' + pergunta;
    this.metricas.perguntas++;

    var doCache = this._cacheGet(chave);
    if (doCache) { this.metricas.cacheAcertos++; return Object.assign({}, doCache, { cache: true }); }

    if (usarFerramenta) {
      var f = await this._ferramenta(pergunta);
      if (f) {
        var res = { texto: f.texto, rota: f.ferramenta, rotaNome: 'ferramenta ' + f.ferramenta, classe: 'ferramenta', confianca: 'alta', tentativas: 0, ferramenta: true, ms: 0 };
        this.metricas.ferramenta++;
        this._cacheSet(chave, res);
        return res;
      }
    }

    var inicio = agora();
    var tentativas = 0;
    var erroFinal = 'sem rota';
    for (var volta = 0; volta < this.voltasMax; volta++) {
      var eu = this;
      var cands = this._candidatos(dificuldade).filter(function (r) { return eu.disponivel(r.id); });
      if (!cands.length) {
        // todas em cooldown: espera a menor cooldown viável
        var eu2 = this, t = agora();
        var futuros = this.catalogo.filter(function (r) { return !eu2.saude[r.id].morta && eu2.saude[r.id].cooldownAte > t; })
                                   .map(function (r) { return eu2.saude[r.id].cooldownAte; });
        var menor = futuros.length ? Math.min.apply(null, futuros) : t;
        var espera = Math.max(400, Math.min(menor - t, 15000));
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
    return { metricas: this.metricas, saude: this.saude, catalogo: this.catalogo.map(function (r) { return { id: r.id, nome: r.nome, classe: r.classe }; }) };
  };

  var api = { Roteador: Roteador, CATALOGO: CATALOGO };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  raiz.RoteadorIA = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
