#!/usr/bin/env node
// AUTO-DIAGNÓSTICO DO CHAT — o produto dita o ritmo (31/10/2026).
//
// Problema que isto resolve: até aqui, quem apontava o próximo defeito era o dono. O Chat tinha
// baterias e números, mas ninguém transformava "o que falhou" em "o que consertar primeiro".
//
// O que este programa faz, sem rede e sem modelo:
//   1. roda as provas do próprio chat (`tools/provas-do-chat.json`, 47 perguntas com resposta
//      conferida à mão) pelo caminho EXATO do produto (aritmética local + razao-local);
//   2. classifica cada prova em: resolvida por código · depende do modelo · resposta errada;
//   3. lê o último banco aberto medido (`bench/*.json`) e classifica as falhas de texto em
//      forma (parágrafo/corte) ou conteúdo (termo/conceito ausente);
//   4. ranqueia as lacunas por (quantas provas × quanto custa consertar) e imprime o topo;
//   5. grava histórico em `docs/auto-melhoria.json` para mostrar tendência entre rodadas.
//
// AUDITORIA DE SI MESMO (rodada 135, 31/10/2026) — porque um medidor também erra:
//   • ARMADILHAS (`tools/armadilhas-do-chat.json`): perguntas que PARECEM resolvíveis mas cuja
//     resposta certa não é a forma conhecida. Se o caminho exato respondê-las, ele está chutando.
//     Foi assim que se achou o erro de porcentagem encadeada (37% de 37% de 200 → 13,69).
//   • PROVA DE FIO: não basta o solucionador saber; o PRODUTO tem de entregar a resposta sem
//     modelo. Para cada prova que o código diz resolver, roda `responder()` com a chamada de
//     modelo quebrada de propósito e confere o texto final. Fio partido aparece aqui.
//   • INTEGRIDADE DO GABARITO: guarda o hash das provas no histórico. Mudar o gabarito para
//     melhorar o placar fica visível e o teste da barreira cobra explicação.
//   • TRAVA DE REGRESSÃO (`--exigir-sem-regressao`): falha se o número de provas resolvidas por
//     código cair em relação à última rodada registrada.
//
// Regra que vale para o próprio diagnóstico: ele NÃO inventa nota. Tudo que sai aqui vem de uma
// prova executada agora ou de um arquivo de medição já salvo no repositório.
//
// Uso:  node tools/auto-melhoria.js [--json]
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const HISTORICO = path.join(RAIZ, 'docs', 'auto-melhoria.json');
const crypto = require('crypto');
function hashArquivo(rel) {
  const p = path.join(RAIZ, rel);
  if (!fs.existsSync(p)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16);
}

const { Roteador } = require(path.join(RAIZ, 'roteador-ia.js'));
const RazaoLocal = require(path.join(RAIZ, 'razao-local.js'));

function normal(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
function numeros(t) {
  const limpo = String(t).replace(/(\d)[.,](?=\d{3}(?!\d))/g, '$1').replace(/(\d),(\d)/g, '$1.$2');
  return (limpo.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
}
// Mesma tolerância da aferição manual: número compara número; texto compara sem acento.
function confere(resposta, aceitos) {
  const t = normal(resposta).trim();
  if (!t) return false;
  const lista = Array.isArray(aceitos) ? aceitos : [aceitos];
  return lista.join('|').split('|').some(function (a) {
    const alvo = normal(a).trim();
    if (/^-?[\d.,]+$/.test(alvo)) {
      const querido = numeros(alvo)[0];
      return numeros(t).some(function (n) { return n === querido; });
    }
    return t.indexOf(alvo) !== -1;
  });
}

/* ---------- 1. provas: quem responde é o código ou o modelo? ---------- */
async function auditarProvas() {
  const arquivo = path.join(RAIZ, 'tools', 'provas-do-chat.json');
  const banco = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const r = new Roteador({ amostrasAberto: 1 });
  const porProva = [];
  for (const p of banco.provas) {
    let resposta = null, caminho = 'modelo';
    const ferramenta = await r._ferramenta(p.q);
    if (ferramenta && ferramenta.texto) { resposta = ferramenta.texto; caminho = 'ferramenta'; }
    if (!resposta) {
      const fato = r._fatos(p.q);
      if (fato && fato.texto) { resposta = fato.texto; caminho = 'fatos'; }
    }
    if (!resposta) {
      const rl = RazaoLocal.resolver(p.q);
      if (rl && rl.texto) { resposta = rl.texto; caminho = 'razao-local'; }
    }
    porProva.push({
      id: p.id, dominio: p.d, natureza: natureza(p.q), caminho: caminho,
      certo: resposta === null ? null : confere(resposta, p.ok),
      resposta: resposta === null ? null : String(resposta).slice(0, 60),
      esperado: p.ok
    });
  }
  return porProva;
}

/* ---------- 1b. armadilhas: o código tem de ficar calado quando não sabe ---------- */
async function auditarArmadilhas() {
  const arquivo = path.join(RAIZ, 'tools', 'armadilhas-do-chat.json');
  if (!fs.existsSync(arquivo)) return null;
  const banco = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const r = new Roteador({ amostrasAberto: 1 });
  const itens = [];
  for (const x of banco.armadilhas) {
    let resposta = null, caminho = null;
    const f = await r._ferramenta(x.q);
    if (f && f.texto) { resposta = f.texto; caminho = 'ferramenta'; }
    if (!resposta) {
      const fato = r._fatos(x.q);
      if (fato && fato.texto) { resposta = fato.texto; caminho = 'fatos'; }
    }
    if (!resposta) {
      const rl = RazaoLocal.resolver(x.q);
      if (rl && rl.texto) { resposta = rl.texto; caminho = 'razao-local'; }
    }
    const controle = Object.prototype.hasOwnProperty.call(x, 'esperado');
    let ok;
    if (controle) ok = resposta !== null && confere(resposta, x.esperado);
    else ok = resposta === null;                       // tinha de ficar calado
    itens.push({ id: x.id, por: x.por, ok: ok, controle: controle,
      resposta: resposta === null ? null : String(resposta).slice(0, 60), caminho: caminho, porque: x.porque });
  }
  return { total: itens.length, ok: itens.filter(function (i) { return i.ok; }).length, itens: itens };
}

/* ---------- 1c. prova de fio: o PRODUTO entrega sem modelo? ---------- */
// Para cada prova que o código diz resolver, roda o caminho real de `responder()` com a chamada
// de modelo quebrada. Se o texto final vier vazio ou diferente, a resposta exata existe mas não
// chega ao usuário — fio partido, e o placar antigo não mostrava isso.
async function provarFio(provas, amostra) {
  const banco = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tools', 'provas-do-chat.json'), 'utf8'));
  const porId = new Map(banco.provas.map(function (p) { return [p.id, p]; }));
  const alvo = provas.filter(function (p) { return p.caminho !== 'modelo'; }).slice(0, amostra);
  const itens = [];
  for (const p of alvo) {
    const prova = porId.get(p.id);
    const r = new Roteador({ amostrasAberto: 1 });
    r._chamar = async function () { return { erro: 'rede', ms: 1 }; };   // modelo quebrado de propósito
    r._consenso = async function () { return null; };
    let resposta = null;
    try {
      const o = await r.responder({ pergunta: prova.q, semConsenso: true, semEsperaBoa: true, semRevisao: true });
      resposta = o && o.texto ? o.texto : null;
    } catch (e) { resposta = null; }
    itens.push({ id: p.id, ok: resposta !== null && confere(resposta, prova.ok), texto: resposta === null ? null : String(resposta).slice(0, 60) });
  }
  return { total: itens.length, ok: itens.filter(function (i) { return i.ok; }).length, itens: itens };
}

/* ---------- 1d. cobertura: cada solucionador tem prova E armadilha? ---------- */
// Um solucionador sem armadilha é um risco não medido: ninguém sabe se ele responde o que não
// devia. Esta auditoria transforma isso em lista de trabalho dentro do próprio relatório.
const SOLUCIONADORES = Object.keys(RazaoLocal).filter(function (k) { return typeof RazaoLocal[k] === 'function' && k !== 'resolver'; });
function cobertura(provasBanco, armadilhasBanco) {
  const mapa = {};
  for (const nome of SOLUCIONADORES) mapa[nome] = { provas: [], armadilhas: [] };
  for (const p of provasBanco) {
    for (const nome of SOLUCIONADORES) {
      let r = null;
      try { r = RazaoLocal[nome](p.q); } catch (e) { r = null; }
      if (r && r.texto) { mapa[nome].provas.push(p.id); break; }
    }
  }
  // A armadilha cobre o solucionador que ela APONTA (`por`), inclusive quando o certo é ele ficar
  // calado — é justamente esse silêncio que a armadilha mede.
  const APELIDOS = { trabalho: 'trabalhoConjunto', contagem: 'contagemDigito', idade: 'problemaIdade',
    deducao: 'silogismo', conjuntos: 'inclusaoExclusao', proporcao: 'operarios', custo: 'custoTotal',
    codigo: 'codigo', memoria: 'memoria', rotacao: 'rotacao', matriz: 'matriz', fila: 'fila',
    probabilidade: 'probabilidade', sequencia: 'sequencia', operarios: 'operarios', trabalho2: 'trabalhoConjunto', 'sequencia-letras': 'sequenciaLetras',
    'ponto-flutuante': 'pontoFlutuante' };
  for (const a of armadilhasBanco) {
    const nome = APELIDOS[a.por] || a.por;
    if (mapa[nome]) { mapa[nome].armadilhas.push(a.id); continue; }
    for (const n of SOLUCIONADORES) {
      let r = null;
      try { r = RazaoLocal[n](a.q); } catch (e) { r = null; }
      if (r && r.texto) { mapa[n].armadilhas.push(a.id); break; }
    }
  }
  const semArmadilha = SOLUCIONADORES.filter(function (n) { return mapa[n].provas.length && !mapa[n].armadilhas.length; });
  const semProva = SOLUCIONADORES.filter(function (n) { return !mapa[n].provas.length; });
  return { porSolucionador: mapa, semArmadilha: semArmadilha, semProva: semProva };
}

/* ---------- 2. texto aberto: forma ou conteúdo ---------- */
function auditarAberto() {
  const dir = path.join(RAIZ, 'bench');
  const arg = (process.argv.find(function (a) { return a.indexOf('--aberto=') === 0; }) || '').split('=')[1];
  if (!fs.existsSync(dir)) return null;
  const candidatos = fs.readdirSync(dir)
    .filter(function (f) { return /^(base-|final-|rev-|resultado-aberto-).*\.json$/.test(f); })
    .map(function (f) {
      const p = path.join(dir, f);
      return { arquivo: f, mtime: fs.statSync(p).mtimeMs, dados: JSON.parse(fs.readFileSync(p, 'utf8')) };
    })
    .filter(function (x) { return x.dados && Array.isArray(x.dados.res) && x.dados.res.length; })
    .sort(function (a, b) { return b.mtime - a.mtime; });
  if (!candidatos.length) return null;
  const escolhido = arg ? candidatos.find(function (c) { return c.arquivo === arg || c.arquivo.indexOf(arg) === 0; }) : candidatos[0];
  if (!escolhido) return { erro: 'nenhum arquivo de medição casa com --aberto=' + arg, candidatos: [] };
  // Nunca escolher o melhor placar escondido: os concorrentes vão no relatório, com número.
  const concorrentes = candidatos.map(function (c) {
    return { arquivo: c.arquivo, passaram: c.dados.sum ? c.dados.sum.passaram : null, total: c.dados.res.length };
  });
  const ultimo = escolhido;
  ultimo.concorrentes = concorrentes;
  const falhas = ultimo.dados.res.filter(function (x) { return !x.ok; });
  const classes = { forma: 0, conteudo: 0 };
  const itens = falhas.map(function (x) {
    const f = (x.falhas || []).join(' · ');
    const forma = /parágrafos|curto|longo|cortad|vazio/.test(f);
    const conteudo = /falta fato/.test(f);
    if (forma && !conteudo) classes.forma++;
    else if (conteudo) classes.conteudo++;
    return { id: x.id, forma: forma, conteudo: conteudo, falhas: f };
  });
  return {
    arquivo: ultimo.arquivo, total: ultimo.dados.res.length, concorrentes: ultimo.concorrentes,
    passaram: ultimo.dados.sum ? ultimo.dados.sum.passaram : ultimo.dados.res.filter(function (x) { return x.ok; }).length,
    medianaMs: ultimo.dados.sum ? ultimo.dados.sum.medianaMs : null,
    cortados: ultimo.dados.sum ? ultimo.dados.sum.cortados : null,
    classes: classes, itens: itens
  };
}

/* ---------- 3. ranquear o que consertar primeiro ---------- */
// Pista lexical: a MESMA frase pode ser conta (mecânica) ou vocabulário (conhecimento).
// O relatório imprime os ids, então a classificação é auditável à mão — não é veredito oculto.
const PISTA_MECANICA = /sequ[eê]ncia|continua|quanto|quantos|soma|some|%|dias|horas|lados|len\(|print\(|typeof|===|inverter|probabilidade|gira|antes de|mais velh|ordem/;
const PISTA_CONHECIMENTO = /sin[ôo]nimo|ant[ôo]nimo|n[ãa]o pertence|analogia|est[áa] para|capital|quem escreveu|moeda|proclamou|maior planeta|coletivo/;
function natureza(pergunta) {
  const t = normal(pergunta);
  // pedir para ESCREVER código é geração, não cálculo: não há resposta exata a computar aqui
  if (/escreva|implemente|crie uma funcao|refatore/.test(t) && /codigo|python|javascript|funcao/.test(t)) return 'geracao';
  if (PISTA_CONHECIMENTO.test(t)) return 'conhecimento';
  if (PISTA_MECANICA.test(t)) return 'mecanico';
  return 'indefinido';
}

function ranquear(provas, aberto) {
  const naoResolvidas = provas.filter(function (p) { return p.caminho === 'modelo'; });
  const erradas = provas.filter(function (p) { return p.certo === false; });
  const porDominio = {};
  for (const p of naoResolvidas) {
    const chave = p.dominio + ' · ' + p.natureza;
    porDominio[chave] = porDominio[chave] || { quantas: 0, ids: [] };
    porDominio[chave].quantas++;
    porDominio[chave].ids.push(p.id);
  }

  let lacunas = [];
  for (const [chave, info] of Object.entries(porDominio)) {
    const mecanico = /mecanico$/.test(chave);
    lacunas.push({
      tipo: mecanico ? 'mecanico-sem-codigo' : 'conhecimento-sem-lexico',
      dominio: chave.replace(' · mecanico', '').replace(' · conhecimento', '').replace(' · indefinido', ''),
      natureza: mecanico ? 'mecanico' : 'conhecimento',
      provas: info.quantas,
      exemplos: info.ids,
      // conta/regra exata é barata e determinística; vocabulário exige léxico curado
      custo: mecanico ? 'baixo' : 'medio',
      ganho: info.quantas,
      acao: chave.indexOf('geracao') === 0
        ? 'geração de texto/código: é do modelo; o roteador só garante formato e devolve null quando não reconhece'
        : mecanico
          ? 'estender o caminho exato (razao-local.js ou _ferramenta) com a forma dessas provas — só se a forma casar; senão devolver null'
          : 'NÃO montar léxico sob medida para as provas (seria ensinar para o teste). Vale só base de fatos estáveis com fonte, ou o modelo'
    });
  }
  if (aberto) {
    if (aberto.classes.conteudo > 0) lacunas.push({
      tipo: 'texto-aberto-conteudo', provas: aberto.classes.conteudo,
      exemplos: aberto.itens.filter(function (i) { return i.conteudo; }).map(function (i) { return i.id; }),
      custo: 'alto', ganho: aberto.classes.conteudo,
      acao: 'só com fonte viva confiável; a revisão por reescrita foi medida e rejeitada (3× latência, 0 ganho)'
    });
    if (aberto.classes.forma > 0) lacunas.push({
      tipo: 'texto-aberto-forma', provas: aberto.classes.forma,
      exemplos: aberto.itens.filter(function (i) { return i.forma; }).map(function (i) { return i.id; }),
      custo: 'baixo', ganho: aberto.classes.forma,
      acao: 'geração incompleta (faltou parágrafo/bloco): o produto ENTREGA o texto como veio e avisa; '
        + 'repartir no portão final foi tentado em 31/10/2026 e revertido — dois testes de produto '
        + 'exigem que a falta apareça, não que seja maquiada. Só o teto de tokens/geração pode resolver'
    });
    if (aberto.cortados) lacunas.push({
      tipo: 'corte-de-texto', provas: aberto.cortados, exemplos: [], custo: 'baixo', ganho: aberto.cortados,
      acao: 'subir teto de tokens do caminho aberto'
    });
  }
  // mescla duplicatas do mesmo tipo+domínio (acontecia quando a pista lexical não decidia)
  const porChave = new Map();
  for (const l of lacunas) {
    const k = l.tipo + '|' + (l.dominio || '');
    if (!porChave.has(k)) { porChave.set(k, Object.assign({}, l)); continue; }
    const atual = porChave.get(k);
    atual.provas += l.provas;
    atual.exemplos = atual.exemplos.concat(l.exemplos);
    atual.ganho = atual.provas;
  }
  lacunas = Array.from(porChave.values());
  const peso = { baixo: 2, medio: 1, alto: 0.5 };
  lacunas.sort(function (a, b) { return (b.ganho * (peso[b.custo] || 1)) - (a.ganho * (peso[a.custo] || 1)); });
  return { naoResolvidas: naoResolvidas.length, erradas: erradas.map(function (p) { return p.id; }), lacunas: lacunas };
}

function salvarHistorico(relatorio) {
  let hist = { esquema: 'auto-melhoria-v1', rodadas: [] };
  try {
    if (fs.existsSync(HISTORICO)) hist = JSON.parse(fs.readFileSync(HISTORICO, 'utf8'));
    if (!Array.isArray(hist.rodadas)) hist.rodadas = [];
  } catch (e) { /* histórico corrompido não impede medir de novo */ }
  hist.rodadas.push({
    quando: new Date().toISOString(),
    provas: relatorio.provas.total,
    porCodigo: relatorio.provas.porCodigo,
    dependemDoModelo: relatorio.provas.dependemDoModelo,
    erradas: relatorio.provas.erradas,
    aberto: relatorio.aberto ? { arquivo: relatorio.aberto.arquivo, passaram: relatorio.aberto.passaram, total: relatorio.aberto.total } : null,
    provasHash: hashArquivo(path.join('tools', 'provas-do-chat.json')),
    armadilhasHash: hashArquivo(path.join('tools', 'armadilhas-do-chat.json')),
    armadilhasOk: relatorio.armadilhas ? relatorio.armadilhas.ok : null,
    fioOk: relatorio.fio ? relatorio.fio.ok : null,
    topo: relatorio.lacunas.slice(0, 3).map(function (l) { return l.tipo + ':' + l.dominio + ':' + l.provas; })
  });
  hist.rodadas = hist.rodadas.slice(-30);
  /* REFERÊNCIA: o melhor já medido com ESTE gabarito. Nunca desce — se um PR piorar o motor, a
     referência continua no alto e a trava segue acusando. Sem isso, comparar com "a rodada
     anterior" deixava a própria rodada ruim virar base (verificado em 31/10/2026). */
  const atual = {
    provasHash: hashArquivo(path.join('tools', 'provas-do-chat.json')),
    armadilhasHash: hashArquivo(path.join('tools', 'armadilhas-do-chat.json')),
    provas: relatorio.provas.total, porCodigo: relatorio.provas.porCodigo,
    armadilhasOk: relatorio.armadilhas ? relatorio.armadilhas.ok : null,
    fioOk: relatorio.fio ? relatorio.fio.ok : null,
    fioTotal: relatorio.fio ? relatorio.fio.total : null
  };
  const ref = hist.referencia;
  const mesmoGabarito = ref && ref.provasHash === atual.provasHash && ref.armadilhasHash === atual.armadilhasHash;
  if (!mesmoGabarito) {
    hist.referencia = atual;                       // gabarito mudou: referência nova, e o relatório avisa
  } else {
    hist.referencia = {
      provasHash: atual.provasHash, armadilhasHash: atual.armadilhasHash,
      provas: Math.max(ref.provas || 0, atual.provas),
      porCodigo: Math.max(ref.porCodigo || 0, atual.porCodigo),
      armadilhasOk: Math.max(ref.armadilhasOk || 0, atual.armadilhasOk || 0),
      // a prova de fio é uma AMOSTRA: só se compara número com o mesmo tamanho de amostra
      fioOk: (ref.fioTotal === atual.fioTotal) ? Math.max(ref.fioOk || 0, atual.fioOk || 0) : atual.fioOk,
      fioTotal: atual.fioTotal
    };
  }
  fs.mkdirSync(path.dirname(HISTORICO), { recursive: true });
  fs.writeFileSync(HISTORICO, JSON.stringify(hist, null, 1) + '\n');
  return hist;
}

(async () => {
  const provas = await auditarProvas();
  const armadilhas = await auditarArmadilhas();
  const fio = await provarFio(provas, Number((process.argv.find(function (a) { return a.indexOf('--fio=') === 0; }) || '').split('=')[1] || 12));
  const aberto = auditarAberto();
  const provasBanco = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tools', 'provas-do-chat.json'), 'utf8')).provas;
  const armadilhasBanco = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tools', 'armadilhas-do-chat.json'), 'utf8')).armadilhas;
  const cob = cobertura(provasBanco, armadilhasBanco);
  const porCodigo = provas.filter(function (p) { return p.caminho !== 'modelo'; }).length;
  const dependemDoModelo = provas.filter(function (p) { return p.caminho === 'modelo'; });
  const erradas = provas.filter(function (p) { return p.certo === false; });
  const ranking = ranquear(provas, aberto);
  if (cob.semArmadilha.length) {
    ranking.lacunas.push({
      tipo: 'solucionador-sem-armadilha', dominio: 'cobertura', provas: cob.semArmadilha.length,
      exemplos: cob.semArmadilha, custo: 'baixo', ganho: cob.semArmadilha.length,
      acao: 'criar armadilha para esses solucionadores: hoje ninguém mede se eles respondem o que não deviam'
    });
  }
  const relatorio = {
    esquema: 'auto-melhoria-v1',
    quando: new Date().toISOString(),
    provas: {
      total: provas.length, porCodigo: porCodigo, dependemDoModelo: dependemDoModelo.length,
      erradas: erradas.map(function (p) { return p.id; }),
      semCodigo: dependemDoModelo.map(function (p) { return { id: p.id, dominio: p.dominio, esperado: p.esperado }; })
    },
    aberto: aberto,
    armadilhas: armadilhas,
    fio: fio,
    cobertura: { semArmadilha: cob.semArmadilha, semProva: cob.semProva },
    lacunas: ranking.lacunas
  };

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(relatorio, null, 1));
    return;
  }

  console.log('== PROVAS (executadas agora, sem rede e sem modelo)');
  console.log('   ' + porCodigo + '/' + provas.length + ' resolvidas por código exato · '
    + dependemDoModelo.length + ' dependem do modelo · ' + erradas.length + ' erradas');
  if (dependemDoModelo.length) {
    console.log('   sem código: ' + dependemDoModelo.map(function (p) { return p.id + ' (' + p.dominio + ')'; }).join(', '));
  }
  if (erradas.length) console.log('   ERRADAS: ' + erradas.map(function (p) { return p.id + ' respondeu "' + p.resposta + '"'; }).join(', '));

  if (armadilhas) {
    console.log('== ARMADILHAS (o código tem de ficar calado quando não sabe)');
    console.log('   ' + armadilhas.ok + '/' + armadilhas.total + ' se comportaram');
    for (const i of armadilhas.itens.filter(function (x) { return !x.ok; })) {
      console.log('   ✘ ' + i.id + (i.resposta ? ' respondeu "' + i.resposta + '"' : ' ficou calado quando devia responder')
        + ' — ' + i.porque);
    }
  }

  console.log('== PROVA DE FIO (o produto entrega, ou só o solucionador sabe?)');
  console.log('   ' + fio.ok + '/' + fio.total + ' provas chegam ao texto final sem modelo');
  for (const i of fio.itens.filter(function (x) { return !x.ok; })) {
    console.log('   ✘ ' + i.id + ' não chegou ao texto final' + (i.texto ? ' (veio "' + i.texto + '")' : ' (veio vazio)'));
  }

  console.log('== COBERTURA DO MOTOR (cada solucionador tem prova e armadilha?)');
  console.log('   ' + SOLUCIONADORES.length + ' solucionadores · sem prova: ' + (cob.semProva.join(', ') || 'nenhum')
    + ' · sem armadilha: ' + (cob.semArmadilha.join(', ') || 'nenhum'));

  if (aberto) {
    if (aberto.concorrentes && aberto.concorrentes.length > 1) {
      console.log('   arquivos de medição no repositório: ' + aberto.concorrentes
        .map(function (c) { return c.arquivo + '=' + c.passaram + '/' + c.total; }).join(' · '));
      console.log('   (usado: ' + aberto.arquivo + ' — escolha com --aberto=<arquivo>; nunca se pega o melhor placar escondido)');
    }
    console.log('== TEXTO ABERTO (arquivo ' + aberto.arquivo + ')');
    console.log('   ' + aberto.passaram + '/' + aberto.total + ' · cortados ' + aberto.cortados
      + ' · falhas de conteúdo ' + aberto.classes.conteudo + ' · de forma ' + aberto.classes.forma
      + (aberto.medianaMs ? ' · mediana ' + Math.round(aberto.medianaMs) + ' ms' : ''));
  } else {
    console.log('== TEXTO ABERTO: nenhum arquivo de medição no repositório (rode bench/medir-aberto.js)');
  }

  console.log('== FILA DE CONSERTO (ranqueada por ganho ÷ custo)');
  if (!ranking.lacunas.length) console.log('   nada a consertar pelas provas de hoje');
  ranking.lacunas.forEach(function (l, i) {
    console.log('   ' + (i + 1) + '. ' + l.tipo + (l.dominio ? ' · ' + l.dominio : '')
      + ' — ' + l.provas + ' prova(s), custo ' + l.custo
      + (l.exemplos.length ? ' [' + l.exemplos.join(', ') + ']' : ''));
    console.log('      → ' + l.acao);
  });

  const hist = salvarHistorico(relatorio);
  const anterior = hist.rodadas.length > 1 ? hist.rodadas[hist.rodadas.length - 2] : null;
  if (anterior) {
    console.log('== TENDÊNCIA: antes ' + anterior.porCodigo + '/' + anterior.provas
      + ' por código · agora ' + porCodigo + '/' + provas.length);
  }
  console.log('histórico em docs/auto-melhoria.json (' + hist.rodadas.length + ' rodada(s))');

  /* TRAVA DE REGRESSÃO: quem manda é a rodada anterior registrada no repositório.
     Serve para a barreira impedir que um PR derrube o caminho exato sem ninguém ver. */
  const referencia = hist.referencia || null;
  if (referencia && referencia.provasHash !== hashArquivo(path.join('tools', 'provas-do-chat.json'))) {
    console.log('⚠ o gabarito de provas MUDOU — placar novo e referência antiga não são comparáveis (referência refeita)');
  }
  if (process.argv.includes('--exigir-sem-regressao') && referencia) {
    const problemas = [];
    if (porCodigo < referencia.porCodigo) problemas.push('provas resolvidas por código caíram de ' + referencia.porCodigo + ' para ' + porCodigo);
    if (armadilhas && referencia.armadilhasOk != null && armadilhas.ok < referencia.armadilhasOk)
      problemas.push('armadilhas respeitadas caíram de ' + referencia.armadilhasOk + ' para ' + armadilhas.ok);
    if (fio && referencia.fioOk != null && referencia.fioTotal === fio.total && fio.ok < referencia.fioOk)
      problemas.push('prova de fio caiu de ' + referencia.fioOk + '/' + referencia.fioTotal + ' para ' + fio.ok + '/' + fio.total);
    if (fio && referencia.fioTotal != null && referencia.fioTotal !== fio.total)
      console.log('   (prova de fio com amostra de ' + fio.total + '; a referência é de ' + referencia.fioTotal + ' — não comparada)');
    if (erradas.length) problemas.push(erradas.length + ' prova(s) respondida(s) ERRADA(S): ' + erradas.map(function (p) { return p.id; }).join(', '));
    if (armadilhas && armadilhas.ok < armadilhas.total)
      problemas.push((armadilhas.total - armadilhas.ok) + ' armadilha(s) respondida(s) por chute');
    if (problemas.length) {
      console.error('✘ REGRESSÃO: ' + problemas.join(' · '));
      process.exitCode = 1;
    } else {
      console.log('✔ sem regressão em relação à rodada anterior registrada');
    }
  }
})();
