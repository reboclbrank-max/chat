from pathlib import Path
p=Path('/home/user/chat-v2/roteador-ia.js')
s=p.read_text()
a=s.index("    if (tipo === 'aberto') {",s.index('  Roteador.prototype.responder = async function'))
b=s.index('\n    function acabamento(txt) {',a)
new='''    if (tipo === 'aberto') {
      var ex = exigenciaDoPedido(pergunta);
      // Todas as etapas de geração compartilham um único prazo. Ferramentas locais ou
      // consultas anteriores podem gastar parte dele; não há cascata extra de minutos.
      var prazoAberto = inicioPedido + this.orcamento;
      var instrucao = SYS_ABERTO + instrucaoFormato(pergunta);
      if (ex.paragrafos) instrucao += ' O pedido exige ' + ex.paragrafos + ' parágrafo(s): entregue exatamente '
        + ex.paragrafos + ' bloco(s) separados por uma linha em branco.';
      if (ex.itens) instrucao += ' O pedido exige uma lista com ' + ex.itens + ' itens numerados, um por linha.';
      var tetoPalavras = ex.maximoExplicito || Math.max(200, Math.round(ex.minPalavras * 2.2));
      if (ex.minimoExplicito && ex.maximoExplicito && ex.minimoExplicito > ex.maximoExplicito)
        instrucao += ' As restrições de tamanho do pedido são conflitantes; não invente que ambas foram cumpridas.';
      else instrucao += ' Escreva entre ' + ex.minPalavras + ' e ' + tetoPalavras + ' palavras; termine o texto por completo.';
      var melhorAberto = null, pontosMelhor = -Infinity, euAberto = this;
      function guardarAberto(cand) {
        if (!cand || !cand.texto) return;
        var a = anotarRespostaAberta(cand, ex);
        var pontos = notaTexto(a.texto, ex) + (a.incompleto ? 0 : 6) - (a.cortado ? 4 : 0);
        if (!melhorAberto || pontos > pontosMelhor) { melhorAberto = a; pontosMelhor = pontos; }
      }
      function devolverAberto(cand) {
        var a = anotarRespostaAberta(cand, ex);
        a.msParede = agora() - inicioPedido;
        if (candidatoAbertoCompleto(a, ex)) euAberto._cacheSet(chave, a);
        euAberto.metricas.sucessos++;
        return a;
      }
      // Primeiro uma resposta inteira: quando funciona, economiza plano e chamadas por
      // parágrafo. Se for parcial, conserva blocos completos e gera só os ausentes.
      if (ex.paragrafos >= 2 && agora() < prazoAberto) {
        var rapido = await this._gerar(pergunta, {
          tentativas: 1, priorizarLatencia: true, prazo: prazoAberto, orcamento: 25000,
          chamar: { maxTokens: 1800, segmento: 25000, sistema: instrucao },
          minPalavras: ex.minPalavras,
          nota: function (t) { return notaTexto(t, ex); },
          transformar: function (t) { return fecharTexto(sanear(t)); }
        });
        guardarAberto(rapido);
        if (candidatoAbertoCompleto(rapido, ex)) return devolverAberto(rapido);
        if (agora() < prazoAberto) {
          var longo = await this._textoLongo(pergunta, ex,
            { prazo: prazoAberto, blocosIniciais: blocosAproveitaveis(rapido, ex) });
          guardarAberto(longo);
          if (candidatoAbertoCompleto(longo, ex)) return devolverAberto(longo);
        }
      } else if (ex.itens >= 2 && agora() < prazoAberto) {
        var lista = await this._listaLonga(pergunta, ex, { prazo: prazoAberto });
        guardarAberto(lista);
        if (candidatoAbertoCompleto(lista, ex)) return devolverAberto(lista);
      }
      if (agora() < prazoAberto) {
        var ga = await this._gerar(pergunta, {
          tentativas: 3, prazo: prazoAberto,
          chamar: { maxTokens: 1800, sistema: instrucao },
          minPalavras: ex.minPalavras,
          nota: function (t) { return notaTexto(ajustarParagrafos(t, ex.paragrafos), ex); },
          transformar: function (t) {
            if (ex.itens >= 2) return ajustarFechamento(fecharTexto(numerarLista(t, ex.itens)), pergunta);
            return ajustarFechamento(fecharTexto(ajustarParagrafos(t, ex.paragrafos)), pergunta);
          }
        });
        guardarAberto(ga);
        if (candidatoAbertoCompleto(ga, ex)) return devolverAberto(ga);
      }
      if (melhorAberto) return devolverAberto(melhorAberto);
      this.metricas.falhas++;
      return { texto: null, erro: 'sem resposta das rotas gratuitas dentro do prazo', ms: agora() - inicioPedido };
    }
'''
s=s[:a]+new+s[b:]
p.write_text(s)
print('Orquestração aberta substituída com orçamento único, rascunho e reaproveitamento.')
