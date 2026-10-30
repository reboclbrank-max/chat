# -*- coding: utf-8 -*-
"""Rodada 95 (reaplicado após perda de árvore de trabalho) — o teto grátis é cota, não inteligência.

1. `peso` por rota = acerto medido no banco difícil (`bench/medir-rotas.js`): Kilo Ultra 100,
   Lightning 90, Laguna 73, Nano-Omni 13, g4f Ultra 10, OVH/g4f/Pollinations 0-7.
2. classe (forte/media/leve) segue a MEDIÇÃO, não o palpite do catálogo.
3. `_candidatos` ordena por peso, depois por latência; o consenso aceita repetir host quando é nele
   que estão os melhores modelos (antes exigia um host por voto e escalava OVH morta).
4. vazão mínima entre chamadas da mesma rota; `Retry-After` do 429 respeitado; geração longa em
   série (paralelo estourava a cota do provedor bom); fallback de pedido longo com 1200 tokens.
5. cache persistente em localStorage (repetição não gasta cota).
6. superlativo com "absoluto sintético" no meio da pergunta cai na tabela local.
"""
import io, re

CAMINHO = '/home/user/chat-v2/roteador-ia.js'
s = io.open(CAMINHO, encoding='utf-8').read()

PESOS = {'gigante2': 100, 'kilolight': 90, 'lagunas': 73, 'nanoomni': 13, 'ultra': 10,
         'ovhq397': 7, 'ovhq': 7, 'ovhoss': 7, 'ovhq38': 7, 'ovhl': 7, 'ovhoss20': 7,
         'ovhnemo': 7, 'ovhq9': 7, 'vlqwen': 3, 'polli': 3, 'glm': 0, 'g4super': 0, 'coherecode': 0}
CLASSES = {'gigante2': 'forte', 'kilolight': 'forte', 'lagunas': 'forte', 'ultra': 'media',
           'nanoomni': 'media'}
for rid in PESOS:
    CLASSES.setdefault(rid, 'leve')

# ---- 1/2. peso + classe no catálogo
linhas = s.split('\n')
novo = []
for l in linhas:
    m = re.search(r"\{ id: '([a-z0-9]+)',\s+nome:", l)
    if m:
        rid = m.group(1)
        if 'peso:' not in l:
            corpo = l.rstrip()
            if corpo.endswith('},'):
                l = corpo[:-2] + ', peso: %d },' % PESOS.get(rid, 0)
            elif corpo.endswith('}'):
                l = corpo[:-1] + ', peso: %d }' % PESOS.get(rid, 0)
        if "classe: '" in l:
            l = re.sub(r"classe: '[a-z]+'", "classe: '%s'" % CLASSES.get(rid, 'leve'), l, count=1)
    novo.append(l)
s = '\n'.join(novo)

# ---- 3. ordenação por força medida
antigo = """      grupo.sort(function (a, b) { return self.saude[a.id].latMedia - self.saude[b.id].latMedia; });"""
novo2 = """      grupo.sort(function (a, b) {
        // peso = acerto medido no banco difícil (bench/medir-rotas.js). Força real antes de velocidade.
        var dp = (b.peso || 0) - (a.peso || 0);
        if (dp !== 0) return dp;
        return self.saude[a.id].latMedia - self.saude[b.id].latMedia;
      });"""
assert antigo in s
s = s.replace(antigo, novo2, 1)

antigo = """    var escolhidos = [], bases = {};
    for (var i = 0; i < candidatos.length && escolhidos.length < this.votos; i++) {
      var b = candidatos[i].base;
      if (bases[b]) continue;
      bases[b] = true; escolhidos.push(candidatos[i]);
    }"""
novo3 = """    // top-N por peso medido; diversidade de host é desejável, mas nunca à custa de trocar um
    // modelo de 100% por um de 7% só porque o host é outro
    var escolhidos = [], bases = {};
    for (var i = 0; i < candidatos.length && escolhidos.length < this.votos; i++) {
      var b = candidatos[i].base;
      if (bases[b] && (candidatos[i].peso || 0) < 50) continue;
      bases[b] = true; escolhidos.push(candidatos[i]);
    }"""
assert antigo in s
s = s.replace(antigo, novo3, 1)

# ---- 4a. _castigar com espera do Retry-After
antigo = """  Roteador.prototype._castigar = function (id, tipo) {
    var s = this.saude[id];
    s.falhas++; s.ultimoErro = tipo;
    s.cooldownAte = agora() + (tipo === 'rate' ? 20000 + Math.random() * 15000"""
novo4 = """  Roteador.prototype._castigar = function (id, tipo, espera) {
    var s = this.saude[id];
    s.falhas++; s.ultimoErro = tipo;
    if (tipo === 'rate' && espera) { s.cooldownAte = agora() + Math.max(espera * 1000, 5000); return; }
    s.cooldownAte = agora() + (tipo === 'rate' ? 20000 + Math.random() * 15000"""
assert antigo in s
s = s.replace(antigo, novo4, 1)

# ---- 4b. captura Retry-After
antigo = """      if (r.status === 429) return { erro: 'rate', ms: agora() - t0 };"""
novo5 = """      if (r.status === 429) {
        var ra = parseInt(r.headers.get('retry-after') || '0', 10);
        return { erro: 'rate', espera: ra > 0 ? ra : null, ms: agora() - t0 };
      }"""
assert antigo in s
s = s.replace(antigo, novo5, 1)

# ---- 4c. vazão mínima entre chamadas
antigo = """  Roteador.prototype.disponivel = function (id) {"""
novo6 = """  /* intervalo mínimo entre chamadas da mesma rota: rajada é o que queima a cota gratuita */
  Roteador.prototype._esperarVez = async function (rota) {
    var s = this.saude[rota.id];
    var intervalo = (rota.peso || 0) >= 70 ? 1200 : 300;
    var falta = (s.ultimaChamada || 0) + intervalo - agora();
    if (falta > 0) await new Promise(function (r) { setTimeout(r, falta); });
    s.ultimaChamada = agora();
  };

  Roteador.prototype.disponivel = function (id) {"""
assert antigo in s
s = s.replace(antigo, novo6, 1)

# ---- 4d. consenso com opções (teto de tokens no fallback do pedido longo)
antigo = """  Roteador.prototype._consenso = async function (pergunta, dificuldade) {"""
novo7 = """  Roteador.prototype._consenso = async function (pergunta, dificuldade, opcoes) {
    var opc = opcoes || {};"""
assert antigo in s
s = s.replace(antigo, novo7, 1)
antigo = """      return self._chamar(rota, pergunta, 22000).then(function (r) {"""
novo8 = """      return self._chamar(rota, pergunta, opc.longo ? 45000 : 22000, opc.chamar).then(function (r) {"""
assert antigo in s
s = s.replace(antigo, novo8, 1)
antigo = """      var c = await this._consenso(pergunta, dificuldade);
      if (c) { this._cacheSet(chave, c); this.metricas.sucessos++; return c; }"""
novo9 = """      var c = await this._consenso(pergunta, dificuldade,
        tipo === 'curto' ? null : { longo: true, chamar: { maxTokens: 1200 } });
      if (c) { this._cacheSet(chave, c); this.metricas.sucessos++; return c; }"""
assert antigo in s
s = s.replace(antigo, novo9, 1)

# ---- 4e. geração longa em série, com vazão e parada antecipada
antigo = """    var pedido = Object.assign({ maxTokens: 1200, longo: true, segmento: 45000 }, opc.chamar || {});
    var respostas = await Promise.all(escolhidos.map(function (rota) {
      return self._chamar(rota, pergunta, pedido.segmento, pedido).then(function (r) {
        if (r.texto) self._premiar(rota.id, r.ms); else self._castigar(rota.id, r.erro);
        return { rota: rota, texto: r.texto || null, erro: r.erro || null, ms: r.ms, bruto: r.bruto || null };
      });
    }));"""
novo10 = """    var pedido = Object.assign({ maxTokens: 1200, longo: true, segmento: 45000 }, opc.chamar || {});
    var respostas = [];
    var inicio = agora();
    for (var k = 0; k < escolhidos.length; k++) {
      var rotaK = escolhidos[k];
      if (k > 0 && agora() - inicio > (opc.orcamento || 90000)) break;
      await this._esperarVez(rotaK);
      var r = await this._chamar(rotaK, pergunta, pedido.segmento, pedido);
      // 429: espera curta e vai para a próxima, em vez de disparar tudo junto e perder a cota
      if (r.erro === 'rate') await new Promise(function (res) { setTimeout(res, 2500 + Math.random() * 2500); });
      if (r.texto) this._premiar(rotaK.id, r.ms); else this._castigar(rotaK.id, r.erro, r.espera);
      respostas.push({ rota: rotaK, texto: r.texto || null, erro: r.erro || null, ms: r.ms, bruto: r.bruto || null });
      if (r.texto && opc.nota && opc.nota(r.texto) >= 6) break;   // resposta boa: para de gastar cota
    }"""
assert antigo in s
s = s.replace(antigo, novo10, 1)

# ---- 5. cache persistente
antigo = """  Roteador.prototype._cacheGet = function (chave) {"""
novo11 = """  var CHAVE_DISCO = 'roteador-cache-v1';

  Roteador.prototype._lerDisco = function () {
    if (typeof localStorage === 'undefined') return;
    try {
      var bruto = localStorage.getItem(CHAVE_DISCO);
      if (!bruto) return;
      var obj = JSON.parse(bruto) || {};
      for (var k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        if (agora() - obj[k].t > this.cacheTtl) continue;
        this.cache.set(k, obj[k]);
      }
    } catch (e) { /* cache em disco é otimização, nunca requisito */ }
  };
  Roteador.prototype._gravarDisco = function () {
    if (typeof localStorage === 'undefined') return;
    try {
      var obj = {};
      this.cache.forEach(function (v, k) { obj[k] = v; });
      localStorage.setItem(CHAVE_DISCO, JSON.stringify(obj));
    } catch (e) { /* cota do navegador cheia: segue sem persistir */ }
  };

  Roteador.prototype._cacheGet = function (chave) {"""
assert antigo in s
s = s.replace(antigo, novo11, 1)
antigo = """    this.cache.set(chave, { v: valor, t: agora() });
  };"""
novo12 = """    this.cache.set(chave, { v: valor, t: agora() });
    this._gravarDisco();
  };"""
assert antigo in s
s = s.replace(antigo, novo12, 1)
antigo = """    this.cache = new Map();"""
novo13 = """    this.cache = new Map();
    this._lerDisco();"""
assert antigo in s
s = s.replace(antigo, novo13, 1)

# ---- 6. superlativo "absoluto sintético"
antigo = r"""if ((m = q.match(/superlativo\s+de\s+(.+?)\??$/i))) {"""
novo14 = r"""if ((m = q.match(/superlativo(?:\s+absoluto)?(?:\s+sint[ée]tico)?\s+de\s+(.+?)\??$/i))) {"""
if antigo in s:
    s = s.replace(antigo, novo14, 1)

io.open(CAMINHO, 'w', encoding='utf-8').write(s)
print('patch 95 reaplicado: peso, classe, ordenação por força, vazão, Retry-After, série, cache em disco, superlativo')
