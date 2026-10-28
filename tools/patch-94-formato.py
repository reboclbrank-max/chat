# -*- coding: utf-8 -*-
"""Rodada 94, parte 2 — o texto aberto estava em 50% e o motivo é verificável:
o modelo entregava um parágrafo quando o pedido exigia dois, ou parava curto.
Consertos:
  1. ler a exigência do próprio pedido ("dois parágrafos", "lista de 5", "cinco dicas");
  2. escrever essa exigência no system prompt (instrução explícita, não esperança);
  3. a nota que escolhe entre candidatos passa a cobrar parágrafos/itens/mínimo de palavras;
  4. três provedores em vez de dois, e teto de 1800 tokens.
Nada disso muda a régua: quem mede continua sendo `bench/medir-aberto.js`.
"""
import io

c = '/home/user/chat-v2/roteador-ia.js'
s = io.open(c, encoding='utf-8').read()

# 1) leitor de exigência
marca = "  function classificarPedido(q) {"
leitor = """  var NUMERAIS = { um: 1, uma: 1, dois: 2, duas: 2, tr\u00eas: 3, 'três': 3, tres: 3, quatro: 4, cinco: 5,
                  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 };

  /* o que o pedido exige, em números: parágrafos, itens da lista e mínimo de palavras */
  function exigenciaDoPedido(q) {
    var t = String(q || ''), ex = { paragrafos: 0, itens: 0, minPalavras: 0 };
    var m = /(\\d+|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez)\\s+par[áa]grafos?/i.exec(t);
    if (m) ex.paragrafos = /^\\d+$/.test(m[1]) ? parseInt(m[1], 10) : (NUMERAIS[m[1].toLowerCase()] || 0);
    else if (/em\\s+(apenas\\s+)?um\\s+par[áa]grafo|um \\u00fanico par[áa]grafo/i.test(t)) ex.paragrafos = 1;
    var mi = /lista\\s+(?:com|de)\\s+(\\d+|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez)/i.exec(t)
      || /(\\d+|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez)\\s+(?:dicas|argumentos|itens|passos|exemplos)/i.exec(t);
    if (mi) ex.itens = /^\\d+$/.test(mi[1]) ? parseInt(mi[1], 10) : (NUMERAIS[mi[1].toLowerCase()] || 0);
    if (/em\\s+tr[eê]s\\s+passos|ponto a ponto/i.test(t) && !ex.itens) ex.itens = 3;
    ex.minPalavras = ex.paragrafos ? 45 * ex.paragrafos : (ex.itens ? 12 * ex.itens : 60);
    return ex;
  }

  function classificarPedido(q) {"""
assert marca in s
s = s.replace(marca, leitor, 1)

# 2) nota com cobrança de formato
marca2 = """  /* texto completo? termina em pontuação, tem parágrafo e não é preâmbulo de raciocínio */"""
nota = """  /* nota de um texto longo: tamanho, fechamento, formato pedido e ausência de robô-speak */
  function notaTexto(t, ex) {
    var s2 = String(t || '').trim();
    if (!s2) return 0;
    var palavras = s2.split(/\\s+/).filter(Boolean).length;
    var paragrafos = s2.split(/\\n+/).filter(function (p) { return p.trim().length > 0; }).length;
    var itens = (s2.match(/^\\s*(?:[-*•]|\\d+[.)])\\s+\\S/gm) || []).length;
    var p = 0;
    if (palavras >= (ex.minPalavras || 60)) p += 3; else if (palavras >= (ex.minPalavras || 60) * 0.6) p += 1;
    if (/[.!?…"”)]\\s*$/.test(s2)) p += 3;                       // fechou o texto
    if (ex.paragrafos && paragrafos >= ex.paragrafos) p += 3;
    if (ex.paragrafos && paragrafos === 1 && ex.paragrafos > 1) p -= 1;
    if (ex.itens && itens >= ex.itens) p += 3;
    if (/\\b(como (um )?modelo de linguagem|n[ãa]o posso (te )?ajudar)/i.test(s2)) p -= 4;
    if (/^\\s*(claro|certamente|com certeza|aqui est[áa]|segue)/i.test(s2)) p -= 1;
    return p;
  }

  /* texto completo? termina em pontuação, tem parágrafo e não é preâmbulo de raciocínio */"""
assert marca2 in s
s = s.replace(marca2, nota, 1)

# 3) responder usa exigência + instrução explícita + 3 tentativas + 1800 tokens
antigo = """    if (tipo === 'aberto') {
      var ga = await this._gerar(pergunta, {
        chamar: { maxTokens: 1400, sistema: SYS_ABERTO },
        minPalavras: 60
      });
      if (ga) { this._cacheSet(chave, ga); this.metricas.sucessos++; return ga; }
    }"""
novo = """    if (tipo === 'aberto') {
      var ex = exigenciaDoPedido(pergunta);
      var instrucao = SYS_ABERTO;
      if (ex.paragrafos) instrucao += ' O pedido exige ' + ex.paragrafos + ' parágrafo(s): entregue exatamente '
        + ex.paragrafos + ' bloco(s) separados por uma linha em branco, cada um com pelo menos 3 frases completas.';
      if (ex.itens) instrucao += ' O pedido exige uma lista com ' + ex.itens + ' itens numerados, um por linha.';
      instrucao += ' Escreva no mínimo ' + ex.minPalavras + ' palavras.';
      var ga = await this._gerar(pergunta, {
        tentativas: 3,
        chamar: { maxTokens: 1800, sistema: instrucao },
        minPalavras: ex.minPalavras,
        nota: function (t) { return notaTexto(t, ex); }
      });
      if (ga) { this._cacheSet(chave, ga); this.metricas.sucessos++; return ga; }
    }"""
assert antigo in s
s = s.replace(antigo, novo, 1)

# 4) exporta para teste
s = s.replace("codigoInteiro: codigoInteiro, textoCompleto: textoCompleto };",
              "codigoInteiro: codigoInteiro, textoCompleto: textoCompleto,\n"
              "                   exigenciaDoPedido: exigenciaDoPedido, notaTexto: notaTexto };")

io.open(c, 'w', encoding='utf-8').write(s)
print('exigência do pedido, nota de formato e 3 tentativas aplicadas')
