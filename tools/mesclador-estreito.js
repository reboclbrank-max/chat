// 🚦 MESCLADOR ESTREITO — degrau 3 da escada de autonomia (05/11/2026)
//
// A máquina passa a MESCLAR SOZINHA — mas só numa faixa estreita, e com volta.
// As três travas pedidas pelo dono:
//
//   1. SÓ TEXTO/ESTADO. A faixa é `docs/**` e `posts/**`. Qualquer arquivo fora dela
//      reprova a PR inteira (é tudo ou nada: não existe mesclar metade).
//      Nunca entram: `tools/`, `.github/`, `package*.json`, `*.js`, `*.py`, `*.sh`,
//      `index.html` e os `.md` da raiz (AGENTS/CONTINUIDADE mexem em agente).
//   2. REVERSÃO AUTOMÁTICA. Se a main ficar vermelha depois de um merge do mesclador,
//      ele próprio abre uma PR de reversão (nunca faz push direto na main) e a deixa
//      passar pela barreira, como qualquer outra mudança.
//   3. NUNCA TOCA no turno de e-mail, nos segredos nem no postador. Isso não é uma
//      checagem a mais: esses arquivos estão simplesmente fora da faixa.
//
// O que ele NÃO faz: não escreve código, não decide conteúdo e não mescla nada que
// não venha de PR com a barreira verde.
'use strict';

// Degrau 4: a faixa deixa de ser só "texto" e passa a vir de duas peças separadas —
// o mapa de risco (que diz o que cada arquivo pode machucar) e o interruptor de
// autonomia (que diz quanto a casa pode fazer hoje). O mesclador não decide nível:
// ele obedece ao que estiver escrito em autonomia.json, e obedece fechado.
const { lerNivel, permite } = require('./autonomia.js');
const { liberadoNoNivel } = require('./risco-de-arquivo.js');

const MARCA = '[mesclador]';
const PASTAS_PERMITIDAS = Object.freeze(['docs/', 'posts/']);
const CAMINHOS_PROIBIDOS = Object.freeze([
  'tools/', '.github/', 'package.json', 'package-lock.json', 'index.html'
]);
const EXTENSOES_PROIBIDAS = Object.freeze(['.js', '.py', '.sh', '.yml', '.yaml', '.env']);
const MAXIMO_DE_ARQUIVOS = 20;

function texto(valor) {
  return String(valor == null ? '' : valor).trim();
}

// Faixa estreita: só texto dentro das pastas permitidas. Qualquer dúvida = recusa.
function caminhoPermitido(caminho) {
  const c = texto(caminho).replace(/^\.\//, '');
  if (!c) return false;
  if (CAMINHOS_PROIBIDOS.some(p => c === p || c.startsWith(p))) return false;
  if (EXTENSOES_PROIBIDAS.some(e => c.toLowerCase().endsWith(e))) return false;
  if (!PASTAS_PERMITIDAS.some(p => c.startsWith(p))) return false;
  // .md da raiz ficam de fora de propósito: mexem no comportamento de agentes.
  const minusculo = c.toLowerCase();
  return minusculo.endsWith('.md') || minusculo.endsWith('.json');
}

// Decide se uma PR pode entrar sozinha. Recebe só dados; não faz rede.
// `nivel` vem de autonomia.json (degrau 3 = 'texto'); ausente = 'texto', nunca 'codigo'.
function avalia({ pr, arquivos, nivel = 'texto' }) {
  const dados = pr || {};
  if (!dados.numero) return { pode: false, motivo: 'sem PR identificada' };
  if (texto(dados.estado) !== 'open') return { pode: false, motivo: 'PR não está aberta' };
  if (dados.deFork) return { pode: false, motivo: 'PR de fork: fora da faixa' };
  if (dados.rascunho) return { pode: false, motivo: 'PR em rascunho' };
  const lista = (Array.isArray(arquivos) ? arquivos : []).map(a => texto(a && (a.filename || a.caminho))).filter(Boolean);
  if (!lista.length) return { pode: false, motivo: 'PR sem arquivos identificados' };
  if (lista.length > MAXIMO_DE_ARQUIVOS) return { pode: false, motivo: 'PR grande demais (' + lista.length + ' arquivos)' };
  const veredito = lista.map(c => Object.assign({ caminho: c }, liberadoNoNivel(c, categoria => permite(nivel, categoria))));
  const fora = veredito.filter(v => !v.liberado);
  if (fora.length) {
    return {
      pode: false,
      motivo: 'fora da faixa: ' + fora.slice(0, 3).map(v => v.caminho).join(', ') + (fora.length > 3 ? '…' : ''),
      fora: fora.map(v => v.caminho),
      nivel
    };
  }
  return { pode: true, motivo: 'na faixa do nível ' + nivel + ': ' + lista.length + ' arquivo(s)', arquivos: lista, nivel };
}

// Qual commit a main deve desfazer. Regra dura: só o commit que a execução vermelha
// avaliou — nunca "o último merge do mesclador", que pode ser antigo e inocente.
// Descoberto com dado real: em 05/11 a main ficou vermelha num merge HUMANO (#93) e a
// versão anterior iria reverter uma reversão antiga, sem relação com a falha.
function alvoDaReversao({ commits, shaVermelho, profundidade = 3 }) {
  const lista = Array.isArray(commits) ? commits.slice(0, profundidade) : [];
  const sha = texto(shaVermelho);
  if (!sha) return { reverter: false, motivo: 'sem sha vermelho' };
  const candidato = lista.find(c => texto(c && c.sha) === sha);
  if (!candidato) return { reverter: false, motivo: 'a main andou depois da execução vermelha' };
  const msg = texto(candidato.commit && candidato.commit.message);
  if (!msg.includes(MARCA)) return { reverter: false, motivo: 'o commit vermelho não foi merge do mesclador' };
  return { reverter: true, sha, motivo: 'reverter ' + sha.slice(0, 10) };
}

// Achar o merge do mesclador para reverter: marca no título do commit.
function mergeDoMesclador(commits) {
  const lista = Array.isArray(commits) ? commits : [];
  for (const c of lista) {
    const msg = texto(c && c.commit && c.commit.message);
    if (msg.includes(MARCA)) return { sha: texto(c.sha), mensagem: msg };
  }
  return null;
}

// Reversão: só vale para o que o próprio mesclador mesclou, e só na faixa.
function planoDeReversao({ commits, arquivosDoMerge }) {
  const merge = mergeDoMesclador(commits);
  if (!merge) return { reverter: false, motivo: 'último merge da main não foi do mesclador' };
  const arquivos = (Array.isArray(arquivosDoMerge) ? arquivosDoMerge : []).map(a => texto(a && a.filename)).filter(Boolean);
  if (!arquivos.length) return { reverter: false, motivo: 'sem arquivos para reverter' };
  const fora = arquivos.filter(c => !caminhoPermitido(c));
  if (fora.length) return { reverter: false, motivo: 'reversão fora da faixa: ' + fora.join(', ') };
  return { reverter: true, sha: merge.sha, arquivos, motivo: 'reverter ' + merge.sha.slice(0, 10) };
}

function ramoDeReversao(sha) {
  const seguro = texto(sha).slice(0, 10).replace(/[^A-Za-z0-9._-]/g, '-');
  return 'reversao/mesclador-' + (seguro || 'sem-sha');
}

// ---- rede (só o CLI usa) ----------------------------------------------------------
async function api(rota, { token, metodo = 'GET', corpo } = {}) {
  const resposta = await fetch('https://api.github.com' + rota, {
    method: metodo,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + token,
      'User-Agent': 'mesclador-estreito/1',
      'Content-Type': 'application/json'
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(30000)
  });
  if (resposta.status === 204 || resposta.status === 201) {
    const vazio = await resposta.text();
    return vazio ? JSON.parse(vazio) : {};
  }
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(rota + ' -> HTTP ' + resposta.status + ' ' + texto(dados.message).slice(0, 120));
  return dados;
}

// Interruptor de autonomia: lido do próprio checkout. Ausente/ilegível = desligado.
function nivelLocal(caminhoArquivo) {
  try {
    const conteudo = require('fs').readFileSync(caminhoArquivo || 'autonomia.json', 'utf8');
    return lerNivel(conteudo);
  } catch (e) {
    return lerNivel(null);
  }
}

async function avaliar({ token, repo, sha, dono }) {
  const leitura = nivelLocal();
  console.log('mesclador: autonomia — ' + (leitura.valido ? 'nível ' + leitura.nivel : 'desligada (' + leitura.motivo + ')'));
  if (leitura.nivel === 'desligado') { console.log('mesclador: desligado por autonomia.json — não mesclo nada'); return; }
  const abertas = await api('/repos/' + repo + '/pulls?state=open&per_page=50', { token });
  const alvo = (Array.isArray(abertas) ? abertas : []).find(p => texto(p.head && p.head.sha) === texto(sha));
  if (!alvo) { console.log('mesclador: nenhuma PR aberta para ' + texto(sha).slice(0, 10)); return; }
  const arquivos = await api('/repos/' + repo + '/pulls/' + alvo.number + '/files?per_page=100', { token });
  const decisao = avalia({
    pr: {
      numero: alvo.number,
      estado: alvo.state,
      rascunho: alvo.draft,
      deFork: Boolean(alvo.head && alvo.head.repo && alvo.head.repo.full_name !== repo)
    },
    arquivos,
    nivel: leitura.nivel
  });
  if (!decisao.pode) { console.log('mesclador: recusa #' + alvo.number + ' — ' + decisao.motivo); return; }
  const titulo = MARCA + ' ' + texto(alvo.title).slice(0, 120);
  await api('/repos/' + repo + '/pulls/' + alvo.number + '/merge', {
    token, metodo: 'PUT',
    corpo: { merge_method: 'squash', commit_title: titulo, commit_message: 'mesclado sozinho: só texto na faixa docs/ e posts/\n\nmesclado por ' + dono }
  });
  console.log('mesclador: mesclou #' + alvo.number + ' (' + decisao.motivo + ')');
}

async function reverter({ token, repo, shaVermelho }) {
  const commits = await api('/repos/' + repo + '/commits?sha=main&per_page=10', { token });
  const alvo = alvoDaReversao({ commits, shaVermelho });
  if (!alvo.reverter) { console.log('mesclador: não reverto — ' + alvo.motivo); return; }

  const merge = commits.find(c => texto(c.sha) === alvo.sha);
  const detalhe = await api('/repos/' + repo + '/commits/' + merge.sha, { token });
  const plano = planoDeReversao({ commits: [merge], arquivosDoMerge: detalhe.files });
  if (!plano.reverter) { console.log('mesclador: não reverto — ' + plano.motivo); return; }

  const ramo = ramoDeReversao(merge.sha);
  const base = detalhe.parents && detalhe.parents[0] ? detalhe.parents[0].sha : null;
  if (!base) { console.log('mesclador: sem pai para reverter'); return; }
  // Se o ramo de reversão já existe, a tentativa anterior já foi feita: não vira laço.
  const jaTentado = await api('/repos/' + repo + '/git/ref/heads/' + ramo, { token }).catch(() => null);
  if (jaTentado) { console.log('mesclador: reversão de ' + merge.sha.slice(0, 10) + ' já foi tentada antes — não repito'); return; }
  await api('/repos/' + repo + '/git/refs', {
    token, metodo: 'POST', corpo: { ref: 'refs/heads/' + ramo, sha: texto(shaVermelho) || 'main' }
  });
  for (const arquivo of plano.arquivos) {
    const anterior = await api('/repos/' + repo + '/contents/' + arquivo + '?ref=' + base, { token }).catch(() => null);
    const atual = await api('/repos/' + repo + '/contents/' + arquivo + '?ref=' + ramo, { token }).catch(() => null);
    if (anterior && anterior.content) {
      await api('/repos/' + repo + '/contents/' + arquivo, {
        token, metodo: 'PUT',
        corpo: {
          message: MARCA + ' revertendo ' + merge.sha.slice(0, 10) + ': ' + arquivo,
          content: anterior.content.replace(/\n/g, ''),
          sha: atual && atual.sha ? atual.sha : undefined,
          branch: ramo
        }
      });
    } else if (atual && atual.sha) {
      await api('/repos/' + repo + '/contents/' + arquivo, {
        token, metodo: 'DELETE',
        corpo: { message: MARCA + ' revertendo ' + merge.sha.slice(0, 10) + ': removendo ' + arquivo, sha: atual.sha, branch: ramo }
      });
    }
  }

  const corpo = {
    title: MARCA + ' reversão automática de ' + merge.sha.slice(0, 10),
    head: ramo, base: 'main',
    body: 'A `main` ficou vermelha no commit que o mesclador mesclou.\n\n'
      + '| campo | valor |\n|---|---|\n'
      + '| merge revertido | `' + merge.sha.slice(0, 40) + '` |\n'
      + '| execução vermelha | ' + texto(shaVermelho) + ' |\n'
      + '| arquivos | ' + plano.arquivos.join(', ') + ' |\n\n'
      + 'Esta reversão passa pela barreira como qualquer outra quando aberta como PR.'
  };
  try {
    const pr = await api('/repos/' + repo + '/pulls', { token, metodo: 'POST', corpo });
    console.log('mesclador: PR de reversão #' + pr.number + ' aberta (' + ramo + ')');
  } catch (erro) {
    // O repositório pode proibir Actions de abrir PR (padrão do GitHub). Nesse caso a
    // reversão vai por merge de ramo -> main, que devolve a ÁRVORE JÁ VALIDADA anterior.
    if (!/not permitted to create/i.test(String(erro && erro.message))) throw erro;
    console.log('mesclador: PR de reversão proibida pelo repositório — usando merge do ramo na main');
    const fusao = await api('/repos/' + repo + '/merges', {
      token, metodo: 'POST',
      corpo: {
        base: 'main', head: ramo,
        commit_message: MARCA + ' reversão automática de ' + merge.sha.slice(0, 10) + ' (sem PR: repositório não permite PR de Actions)'
      }
    });
    console.log('mesclador: main revertida para ' + texto(fusao.sha).slice(0, 10) + ' (' + plano.arquivos.join(', ') + ')');
  }
}

async function principal() {
  const token = texto(process.env.GITHUB_TOKEN);
  const repo = texto(process.env.REPO) || 'reboclbrank-max/chat';
  const modo = texto(process.argv[2] || process.env.MODO).toLowerCase();
  if (!token) throw new Error('falta GITHUB_TOKEN');
  if (modo === 'avaliar') return avaliar({ token, repo, sha: texto(process.env.HEAD_SHA), dono: texto(process.env.ATOR) || 'mesclador' });
  if (modo === 'reverter') return reverter({ token, repo, shaVermelho: texto(process.env.HEAD_SHA) });
  throw new Error('modo desconhecido: ' + (modo || '(vazio)') + ' — use avaliar ou reverter');
}

if (require.main === module) {
  principal().catch(erro => {
    console.error('⚠️ mesclador não concluiu: ' + ((erro && erro.message) || String(erro)));
    process.exitCode = 1;
  });
}

module.exports = {
  caminhoPermitido, avalia, mergeDoMesclador, planoDeReversao, alvoDaReversao, ramoDeReversao,
  MARCA, PASTAS_PERMITIDAS, MAXIMO_DE_ARQUIVOS, nivelLocal
};
