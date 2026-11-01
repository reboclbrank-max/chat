from pathlib import Path
p=Path('/home/user/chat-v2/roteador-ia.js')
s=p.read_text()
a=s.index('  Roteador.prototype._listaLonga = async function (pergunta, ex) {')
b=s.index('\n  /* termos concretos do pedido:',a)
new='''  Roteador.prototype._listaLonga = async function (pergunta, ex, opcoes) {
    var self = this, opc = opcoes || {};
    var n = Math.max(2, ex.itens || 1);
    if (n > 10) return null;
    var minTotal = ex.minPalavras || 60;
    var minPorItem = Math.max(12, Math.ceil((minTotal / n) * 1.15));
    var inicio = agora(), prazo = Math.min(opc.prazo || Infinity, inicio + 110000);
    var vistas = {}, rotas = [];
    ['forte', 'media', 'leve'].forEach(function (cl) {
      self._candidatos(cl).forEach(function (r) {
        if (vistas[r.id] || self.saude[r.id].morta) return;
        vistas[r.id] = 1; rotas.push(r);
      });
    });
    var idx = 0, linhas = [], tentativas = 0;
    for (var i = 0; i < n && agora() < prazo; i++) {
      var feito = null, jaTentadas = {};
      var ped = 'Tema: ' + pergunta + '\\n\\nEscreva SOMENTE o item ' + (i + 1) + ' de ' + n +
        ', em português do Brasil, em uma única linha, com ' + (minPorItem + 5) + ' a ' + (minPorItem + 25) +
        ' palavras, começando por "' + (i + 1) + '. ".' +
        ' Não repita os itens anteriores, não escreva título nem introdução, e termine a frase.';
      for (var tentativa = 0; tentativa < 7 && !feito && agora() < prazo; tentativa++) {
        var rota = null;
        for (var busca = 0; busca < rotas.length; busca++) {
          var cand = rotas[idx++ % rotas.length];
          if (!jaTentadas[cand.id] && self.disponivel(cand.id)) { rota = cand; break; }
        }
        if (!rota) {
          // Só aguardar um cooldown real, nunca chamar antes de Retry-After. Se o
          // prazo não permite outra tentativa, preserva os itens que já saíram.
          var t = agora(), proximos = rotas.filter(function (r) {
            return !self.saude[r.id].morta && self._ateDisponivel(r) > t;
          }).map(function (r) { return self._ateDisponivel(r); });
          if (!proximos.length) break;
          var espera = Math.min.apply(null, proximos) - t + 10;
          if (espera >= prazo - t || espera > 30000) break;
          await new Promise(function (res) { setTimeout(res, espera); });
          jaTentadas = {};
          continue;
        }
        jaTentadas[rota.id] = true;
        if (await self._esperarVez(rota, prazo) === false) break;
        if (!self.disponivel(rota.id) || agora() >= prazo) continue;
        var r = await self._chamar(rota, ped, Math.min(25000, prazo - agora()),
          { maxTokens: 300, longo: true, sistema: SYS_ABERTO });
        tentativas++;
        if (r.texto) self._premiar(rota.id, r.ms); else self._castigar(rota.id, r.erro, r.espera);
        var txt = sanear(String(r.texto || '').trim()).replace(/\\s*\\n+\\s*/g, ' ');
        var palavras = txt.split(/\\s+/).filter(Boolean).length;
        var piso = tentativa < 4 ? minPorItem : Math.floor(minPorItem * 0.7);
        if (txt && palavras >= Math.max(10, piso) && /[.!?…]["”)]?$/.test(txt))
          feito = String(i + 1) + '. ' + txt.replace(/^\\d+[.)]\\s*/, '');
      }
      if (!feito) break;
      linhas.push(feito);
    }
    if (!linhas.length) return null;
    var texto = linhas.join('\\n');
    var parcial = linhas.length < n || !textoCompleto(texto, minTotal);
    return {
      texto: texto, rota: 'lista-longa', rotaNome: parcial ? 'geração parcial de lista' : 'geração item a item',
      classe: 'forte', confianca: 'alta', parcial: parcial, tentativas: tentativas, ms: agora() - inicio,
      candidatos: linhas.map(function (l) { return { palavras: l.split(/\\s+/).filter(Boolean).length }; })
    };
  };
'''
s=s[:a]+new+s[b:]
p.write_text(s)
print('Substituída a orquestração da lista mantendo rubrica e texto sem dados de gabarito.')
