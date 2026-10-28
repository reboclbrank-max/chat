# -*- coding: utf-8 -*-
"""Rodada 94 — atacar o que a v2.2 deixou como "não medido":

1. **Redação longa e código**: `_chamar` tinha `max_tokens: 400` fixo. Em redação isso trunca no
   meio da frase; em código corta a função. Agora existe caminho generativo com teto maior, sem
   consenso (votação não faz sentido para texto longo) e com escolha por critério objetivo.
2. **Perguntas de vários saltos**: entra um compositor local de 2–3 passos (troco, consumo,
   distância com dois trechos, saldo) — determinístico e R$ 0.
3. Nada de afrouxar régua: as regras novas só valem onde a aritmética é unívoca.
"""
import io

c = '/home/user/chat-v2/roteador-ia.js'
s = io.open(c, encoding='utf-8').read()

# ---------------------------------------------------------------- 1. _chamar com opções
antigo = """  Roteador.prototype._chamar = async function (rota, pergunta, timeoutMs) {
    var url = rota.base.replace(/\\/$/, '') + '/chat/completions';
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
      });"""
novo = """  Roteador.prototype._chamar = async function (rota, pergunta, timeoutMs, opcoes) {
    var opc = opcoes || {};
    var url = rota.base.replace(/\\/$/, '') + '/chat/completions';
    var c = new AbortController();
    var limite = timeoutMs || (opc.longo ? 45000 : this.timeoutRota);
    var t = setTimeout(function () { c.abort(); }, limite);
    var t0 = agora();
    try {
      var r = await fetch(url, {
        method: 'POST', signal: c.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: rota.modelo,
          temperature: opc.temperatura == null ? 0 : opc.temperatura,
          max_tokens: opc.maxTokens || 400,
          messages: [{ role: 'system', content: opc.sistema || SYS }, { role: 'user', content: pergunta }]
        })
      });"""
assert antigo in s
s = s.replace(antigo, novo, 1)

# no modo longo o sanear não se aplica (texto corrido não é "resposta curta"), só a guarda de vazio
antigo = """      var texto = (msg.content || '').trim();
      if (!texto && msg.reasoning) texto = sanear(extrairConclusao(String(msg.reasoning)));
      texto = sanear(texto);
      if (!texto) return { erro: 'degenerada', ms: agora() - t0 };
      return { texto: texto, ms: agora() - t0 };"""
novo = """      var texto = (msg.content || '').trim();
      if (opc.longo) {
        if (!util(texto)) return { erro: 'degenerada', ms: agora() - t0 };
        return { texto: texto, ms: agora() - t0, bruto: d.choices[0].finish_reason || null };
      }
      if (!texto && msg.reasoning) texto = sanear(extrairConclusao(String(msg.reasoning)));
      texto = sanear(texto);
      if (!texto) return { erro: 'degenerada', ms: agora() - t0 };
      return { texto: texto, ms: agora() - t0, bruto: d.choices[0].finish_reason || null };"""
assert antigo in s
s = s.replace(antigo, novo, 1)

# ---------------------------------------------------------------- 2. prompts e classificador
marca = "  /* ---------- português ---------- */"
bloco = """  /* ---------- pedido longo: código e texto ---------- */
  var SYS_CODIGO = 'Responda apenas com o código completo em um bloco de código, sem explicação antes nem depois. '
    + 'O código precisa ser autossuficiente: sem biblioteca externa, sem leitura de arquivo, sem variável indefinida. '
    + 'Se pedirem função, exporte com module.exports.';
  var SYS_ABERTO = 'Responda em português do Brasil, no formato pedido, apenas com o texto final. '
    + 'Sem preâmbulo ("claro", "com certeza"), sem comentar o pedido, sem escrever raciocínio. '
    + 'Termine todas as frases; não deixe texto pela metade.';

  function classificarPedido(q) {
    var t = String(q || '');
    if (/```|\\bem (javascript|python|typescript|node)\\b|(escreva|implemente|crie|faça)\\b[^?]{0,60}\\b(função|programa|classe|código|script|algoritmo|endpoint)\\b/i.test(t)) return 'codigo';
    if (/(escreva|redija|explique|resuma|descreva|compare|argumente|conte uma história|faça um[ao]?\\s+(texto|roteiro|artigo|poema|e-mail|resumo|plano|lista)|lista de \\d+|passo a passo)/i.test(t)) return 'aberto';
    return 'curto';
  }

  /* tira o código do bloco; devolve '' quando não há código reconhecível */
  function extrairCodigo(texto) {
    var t = String(texto || '');
    var m = /```(?:javascript|js|jsx|ts|typescript|python|py)?\\s*\\n([\\s\\S]*?)```/i.exec(t);
    var corpo = m ? m[1] : t;
    corpo = corpo.replace(/^\\s*(aqui est[áa]|segue|certo)[^\\n]*\\n/i, '').trim();
    if (!/function|=>|class |const |let |var |def |console\\.log|module\\.exports/.test(corpo)) return '';
    return corpo.trim();
  }

  /* código completo? (chaves/fechamento coerentes — não prova correção, só prova que não cortou) */
  function codigoInteiro(codigo) {
    if (!codigo || codigo.length < 40) return false;
    var abre = (codigo.match(/[{([]/g) || []).length, fecha = (codigo.match(/[})\\]]/g) || []).length;
    if (abre !== fecha) return false;
    return /}\\s*;?\\s*$/.test(codigo.trim()) || /return\\b/.test(codigo);
  }

  /* texto completo? termina em pontuação, tem parágrafo e não é preâmbulo de raciocínio */
  function textoCompleto(t, minPalavras) {
    var s2 = String(t || '').trim();
    if (!s2) return 0;
    var palavras = s2.split(/\\s+/).length;
    var p = 0;
    if (palavras >= (minPalavras || 40)) p += 2;
    if (/[.!?…"”)]\\s*$/.test(s2)) p += 2;
    if (!/\\b(claro|certamente|com certeza|aqui est[áa]|segue (o|a))\\b\\s*[!.,:]/i.test(s2.slice(0, 60))) p += 1;
    if (/\\n\\s*\\n/.test(s2)) p += 1;
    if (/\\b(como (um )?modelo de linguagem|n[ãa]o posso (te )?ajudar|desculpe)/i.test(s2)) p -= 3;
    return p;
  }

  /* ---------- português ---------- */"""
assert marca in s
s = s.replace(marca, bloco, 1)

# ---------------------------------------------------------------- 3. _gerar (caminho longo)
marca2 = "  /* ============ API PRINCIPAL ============ */"
gerar = """  /* ============ GERAÇÃO LONGA (código e texto) ============ */
  /* Sem consenso: votação de maioria não faz sentido para texto longo nem para código.
     Em vez disso, dois provedores no máximo, e a escolha é por critério objetivo declarado. */
  Roteador.prototype._gerar = async function (pergunta, opcoes) {
    var self = this;
    var opc = opcoes || {};
    var tentativas = opc.tentativas || 2;
    var cands = this._candidatos(opc.dificuldade || 'media').filter(function (r) { return self.disponivel(r.id); });
    var escolhidos = [], bases = {};
    for (var i = 0; i < cands.length && escolhidos.length < tentativas; i++) {
      if (bases[cands[i].base]) continue;
      bases[cands[i].base] = true; escolhidos.push(cands[i]);
    }
    if (!escolhidos.length) return null;

    var pedido = Object.assign({ maxTokens: 1200, longo: true, segmento: 45000 }, opc.chamar || {});
    var respostas = await Promise.all(escolhidos.map(function (rota) {
      return self._chamar(rota, pergunta, pedido.segmento, pedido).then(function (r) {
        if (r.texto) self._premiar(rota.id, r.ms); else self._castigar(rota.id, r.erro);
        return { rota: rota, texto: r.texto || null, erro: r.erro || null, ms: r.ms, bruto: r.bruto || null };
      });
    }));

    var validas = respostas.filter(function (x) { return x.texto; });
    if (!validas.length) return null;

    var nota = opc.nota || function (t) { return textoCompleto(t, opc.minPalavras); };
    var melhor = null;
    validas.forEach(function (x) {
      var n = nota(x.texto);
      if (!melhor || n > melhor.nota) melhor = { texto: x.texto, rota: x.rota, nota: n, ms: x.ms, bruto: x.bruto };
    });
    this.metricas.consenso++;
    return {
      texto: opc.transformar ? opc.transformar(melhor.texto) : melhor.texto,
      rota: melhor.rota.id, rotaNome: melhor.rota.nome, classe: melhor.rota.classe,
      confianca: melhor.nota >= 5 ? 'alta' : (melhor.nota >= 3 ? 'media' : 'baixa'),
      nota: melhor.nota, tentativas: respostas.length, ms: melhor.ms,
      candidatos: validas.map(function (x) { return { rota: x.rota.id, nota: nota(x.texto), palavras: String(x.texto).split(/\\s+/).length }; })
    };
  };

  /* ============ API PRINCIPAL ============ */"""
assert marca2 in s
s = s.replace(marca2, gerar, 1)

# ---------------------------------------------------------------- 4. responder usa o caminho novo
antigo = """    if (usarConsenso) {
      var c = await this._consenso(pergunta, dificuldade);
      if (c) { this._cacheSet(chave, c); this.metricas.sucessos++; return c; }
    }"""
novo = """    /* pedido longo (texto/código) não passa por consenso nem por 400 tokens */
    var tipo = (typeof pedido === 'object' && pedido.tipo) || (usarFerramenta === false ? 'curto' : classificarPedido(pergunta));
    if (tipo === 'codigo') {
      var gc = await this._gerar(pergunta, {
        chamar: { maxTokens: 1600, sistema: SYS_CODIGO },
        minPalavras: 0,
        nota: function (t) { var cod = extrairCodigo(t); return codigoInteiro(cod) ? 5 : (cod ? 2 : 0); },
        transformar: function (t) { var cod = extrairCodigo(t); return cod ? '```\\n' + cod + '\\n```' : t; }
      });
      if (gc) { this._cacheSet(chave, gc); this.metricas.sucessos++; return gc; }
    }
    if (tipo === 'aberto') {
      var ga = await this._gerar(pergunta, {
        chamar: { maxTokens: 1400, sistema: SYS_ABERTO },
        minPalavras: 60
      });
      if (ga) { this._cacheSet(chave, ga); this.metricas.sucessos++; return ga; }
    }

    if (usarConsenso) {
      var c = await this._consenso(pergunta, dificuldade);
      if (c) { this._cacheSet(chave, c); this.metricas.sucessos++; return c; }
    }"""
assert antigo in s
s = s.replace(antigo, novo, 1)

# ---------------------------------------------------------------- 5. multietapa local
marca3 = "    /* --- capital (Wikidata P36) --- */"
multi = """    /* --- vários saltos: compositor local de 2–3 passos (só onde a aritmética é unívoca) --- */
    var multi = this._encadeado(q);
    if (multi) return multi;

    /* --- capital (Wikidata P36) --- */"""
assert marca3 in s
s = s.replace(marca3, multi, 1)

funcao = """  /* ---------- vários saltos ---------- */
  Roteador.prototype._encadeado = function (q) {
    var m, num = function (t) { return parseFloat(String(t).replace(',', '.')); };
    var fmt = function (v) { return String(Math.round(v * 1e6) / 1e6).replace('.', ','); };

    // troco: cada X custa R$Y, compra Z, paga com R$W
    if ((m = q.match(/(?:cada|o)\\s+\\w+\\s+custa\\s*r?\\$?\\s*(\\d+(?:[.,]\\d+)?).*?(?:compra|compro|leva|levou)\\s+(\\d+).*?paga\\s+com\\s+r?\\$?\\s*(\\d+(?:[.,]\\d+)?)/i))) {
      var preco = num(m[1]), qtd = num(m[2]), pago = num(m[3]);
      if (preco * qtd <= pago) return { texto: fmt(pago - preco * qtd), ferramenta: 'encadeado-troco', fonte: 'regra aritmética local (2 passos)' };
    }
    // consumo: faz K km por litro, tanque L litros → km
    if ((m = q.match(/(\\d+(?:[.,]\\d+)?)\\s*km\\s*(?:por|com um litro|\\/)\\s*litros?.*?(\\d+(?:[.,]\\d+)?)\\s*litros?/i))
      || (m = q.match(/faz\\s+(\\d+(?:[.,]\\d+)?)\\s*km\\s+por\\s+litro[^?]*?(\\d+(?:[.,]\\d+)?)\\s*litros/i))) {
      return { texto: fmt(num(m[1]) * num(m[2])), ferramenta: 'encadeado-consumo', fonte: 'regra aritmética local (2 passos)' };
    }
    // dois trechos: X km/h por N horas e depois mais M horas
    if ((m = q.match(/(\\d+(?:[.,]\\d+)?)\\s*km\\s*(?:por|\\/)\\s*hora.*?(\\d+(?:[.,]\\d+)?)\\s*horas?.*?(?:mais|depois|e ainda)\\s*(\\d+(?:[.,]\\d+)?)\\s*horas?/i))) {
      return { texto: fmt(num(m[1]) * (num(m[2]) + num(m[3]))), ferramenta: 'encadeado-distancia', fonte: 'regra aritmética local (2 passos)' };
    }
    // saldo: tinha A, ganhou B, gastou C
    if ((m = q.match(/tinha\\s+(\\d+).*?(?:ganhou|recebeu)\\s+(\\d+).*?(?:gastou|perdeu)\\s+(\\d+)/i))) {
      return { texto: fmt(num(m[1]) + num(m[2]) - num(m[3])), ferramenta: 'encadeado-saldo', fonte: 'regra aritmética local (3 passos)' };
    }
    // caixas: N caixas com M unidades cada, K estragam
    if ((m = q.match(/(\\d+)\\s*caixas?\\s+com\\s+(\\d+)[^?]*?cada[^?]*?(\\d+)\\s*(?:estrag|quebr|fora|perdid)/i))) {
      return { texto: fmt(num(m[1]) * num(m[2]) - num(m[3])), ferramenta: 'encadeado-caixas', fonte: 'regra aritmética local (2 passos)' };
    }
    // proporção + desconto: N custam V, quer M com desconto de P%
    if ((m = q.match(/(\\d+)\\s*\\w+\\s+custam\\s*r?\\$?\\s*(\\d+(?:[.,]\\d+)?).*?quant[oa]s?\\s+custam\\s+(\\d+).*?desconto\\s+de\\s+(\\d+(?:[.,]\\d+)?)\\s*%/i))) {
      var unit = num(m[2]) / num(m[1]), bruto = unit * num(m[3]);
      return { texto: fmt(bruto * (1 - num(m[4]) / 100)), ferramenta: 'encadeado-desconto', fonte: 'regra aritmética local (2 passos)' };
    }
    // metade/dobro combinados: dobro de A menos metade de B
    if ((m = q.match(/dobro\\s+de\\s+(\\d+).*?menos\\s+a\\s+metade\\s+de\\s+(\\d+)/i))) {
      return { texto: fmt(2 * num(m[1]) - num(m[2]) / 2), ferramenta: 'encadeado-dobro-metade', fonte: 'regra aritmética local (2 passos)' };
    }
    // horas → minutos → segundos
    if ((m = q.match(/(\\d+(?:[.,]\\d+)?)\\s*horas?\\s+e\\s+(\\d+)\\s*minutos?.*?quant[oa]s?\\s+segundos/i))) {
      return { texto: fmt(num(m[1]) * 3600 + num(m[2]) * 60), ferramenta: 'encadeado-tempo', fonte: 'regra aritmética local (2 passos)' };
    }
    return null;
  };

  /* ---------- português ---------- */"""
s = s.replace("  /* ---------- português ---------- */", funcao, 1)

# ---------------------------------------------------------------- 6. exporta para teste
s = s.replace("  api.internos = { sanear: sanear, util: util, extrairConclusao: extrairConclusao };",
              "  api.internos = { sanear: sanear, util: util, extrairConclusao: extrairConclusao,\n"
              "                   classificarPedido: classificarPedido, extrairCodigo: extrairCodigo,\n"
              "                   codigoInteiro: codigoInteiro, textoCompleto: textoCompleto };")

io.open(c, 'w', encoding='utf-8').write(s)
print('roteador: caminho longo (código/texto), classificador, multietapa e exports aplicados')
