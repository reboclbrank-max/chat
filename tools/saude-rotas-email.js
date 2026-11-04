// 🧠 MEMÓRIA DE ROTAS DO CANAL DE E-MAIL (04/11/2026)
//
// O canal de e-mail não usa o `Roteador` da página: ele tem o próprio cérebro (`cerebro()` no
// email-chat.js), que corre PARES de rotas em ordem FIXA em cada turno. Como cada turno é um
// processo novo no GitHub Actions, esse cérebro não lembrava nada: se a rota 'frota' estivesse
// quebrada, todo turno pagava o timeout de 45 s nela outra vez, antes de chegar na 'reserva'.
//
// Este módulo guarda apenas CONTAGENS e INSTANTES por nome de rota, num JSON pequeno, e devolve
// a ordem dos candidatos já ajustada. Nada de pergunta, resposta, URL, modelo ou mensagem de
// erro vai para o arquivo — só número inteiro e nome curto de rota.
//
// Regras de esquecimento (para não virar preconceito permanente):
//   • registro com mais de 24 h é descartado na leitura;
//   • rota que falhou nos últimos 10 min cai 3 pontos; que respondeu nos últimos 10 min sobe 1;
//   • pontuação base é `ok - falhas`, com empate preservando a ordem original (ordem estável).
// Se o arquivo não existir, estiver corrompido ou o ambiente não permitir escrita, o módulo
// devolve a ordem original: memória é otimização, nunca requisito.
'use strict';

const fs = require('fs');

const VERSAO = 1;
const MAX_ROTAS = 20;
const VALIDADE_MS = 24 * 60 * 60 * 1000;
const JANELA_RECENTE_MS = 10 * 60 * 1000;
const JANELA_RUIM = 3;
const JANELA_BOA = 1;

function inteiro(v) {
  const n = Number(v);
  if (!isFinite(n) || n < 0) return 0;
  return Math.min(9999, Math.floor(n));
}

// Instante em ms: sem teto de contador, senão 1,7e12 vira 9999 e o registro parece de 1970.
function instante(v) {
  const n = Number(v);
  if (!isFinite(n) || n < 0) return 0;
  return Math.min(4102444800000, Math.floor(n)); // teto: ano 2100
}

function vazio() {
  return { versao: VERSAO, rotas: {} };
}

/** Lê o retrato do disco. Devolve sempre um objeto válido. */
function ler(caminho) {
  const saida = vazio();
  if (!caminho) return saida;
  let bruto;
  try {
    bruto = fs.readFileSync(caminho, 'utf8');
  } catch (e) {
    return saida; // arquivo ausente é o caso normal no primeiro turno
  }
  if (!bruto || bruto.length > 20000) return saida; // acima disso não é memória, é lixo
  let json;
  try {
    json = JSON.parse(bruto);
  } catch (e) {
    return saida; // JSON corrompido: começa limpo em vez de quebrar o turno
  }
  if (!json || json.versao !== VERSAO || !json.rotas || typeof json.rotas !== 'object') return saida;
  const agora = Date.now();
  let n = 0;
  for (const nome of Object.keys(json.rotas)) {
    if (n >= MAX_ROTAS) break;
    const r = json.rotas[nome];
    if (!r || typeof r !== 'object') continue;
    const ok = inteiro(r.ok);
    const falhas = inteiro(r.falhas);
    const ultimaOk = instante(r.ultimaOk);
    const ultimaFalha = instante(r.ultimaFalha);
    if (!ultimaOk && !ultimaFalha) continue;
    const idade = agora - Math.max(ultimaOk, ultimaFalha);
    if (!isFinite(idade) || idade < 0 || idade > VALIDADE_MS) continue; // velho não condena
    saida.rotas[String(nome).slice(0, 40)] = { ok, falhas, ultimaOk, ultimaFalha };
    n++;
  }
  return saida;
}

/** Anota o resultado de uma rota. `ok=false` conta falha; `ok=true` conta sucesso. */
function registrar(saude, nome, ok, agora) {
  if (!saude || !saude.rotas || typeof nome !== 'string' || !nome) return saude;
  const t = agora === undefined ? Date.now() : Number(agora);
  const chave = nome.slice(0, 40);
  const r = saude.rotas[chave] || { ok: 0, falhas: 0, ultimaOk: 0, ultimaFalha: 0 };
  if (ok) {
    r.ok = Math.min(9999, inteiro(r.ok) + 1);
    r.ultimaOk = t;
  } else {
    r.falhas = Math.min(9999, inteiro(r.falhas) + 1);
    r.ultimaFalha = t;
  }
  saude.rotas[chave] = r;
  return saude;
}

/** Nota da rota: quanto maior, mais cedo ela deve ser tentada. */
function pontuar(estadoRota, agora) {
  if (!estadoRota) return 0;
  const t = agora === undefined ? Date.now() : agora;
  let nota = inteiro(estadoRota.ok) - inteiro(estadoRota.falhas);
  if (estadoRota.ultimaFalha && t - estadoRota.ultimaFalha <= JANELA_RECENTE_MS) nota -= JANELA_RUIM;
  if (estadoRota.ultimaOk && t - estadoRota.ultimaOk <= JANELA_RECENTE_MS) nota += JANELA_BOA;
  return nota;
}

/**
 * Devolve NOVA ordem para a lista de rotas `[[nome, url, corpo, bearer], ...]`.
 * Ordem estável: quem tem a mesma nota fica na posição relativa original.
 */
function ordenar(rotas, saude, agora) {
  const lista = Array.isArray(rotas) ? rotas.slice() : [];
  if (!saude || !saude.rotas) return lista;
  const t = agora === undefined ? Date.now() : agora;
  const notas = new Map();
  for (const r of lista) {
    const nome = r && r[0];
    notas.set(nome, pontuar(saude.rotas[String(nome).slice(0, 40)], t));
  }
  return lista
    .map((r, i) => ({ r, i, nota: notas.get(r && r[0]) || 0 }))
    .sort((a, b) => (b.nota - a.nota) || (a.i - b.i))
    .map((x) => x.r);
}

/** Grava o retrato de forma atômica e sanitizada. Silêncio em caso de falha. */
function gravar(caminho, saude, agora) {
  if (!caminho || !saude || !saude.rotas) return false;
  const t = agora === undefined ? Date.now() : agora;
  const saida = vazio();
  let n = 0;
  for (const nome of Object.keys(saude.rotas)) {
    if (n >= MAX_ROTAS) break;
    const r = saude.rotas[nome] || {};
    const ultimaOk = instante(r.ultimaOk);
    const ultimaFalha = instante(r.ultimaFalha);
    if (!ultimaOk && !ultimaFalha) continue;
    if (t - Math.max(ultimaOk, ultimaFalha) > VALIDADE_MS) continue;
    saida.rotas[String(nome).slice(0, 40)] = {
      ok: inteiro(r.ok),
      falhas: inteiro(r.falhas),
      ultimaOk: ultimaOk,
      ultimaFalha: ultimaFalha
    };
    n++;
  }
  const texto = JSON.stringify(saida) + '\n';
  const temporario = caminho + '.tmp';
  try {
    fs.writeFileSync(temporario, texto);
    fs.renameSync(temporario, caminho);
    return true;
  } catch (e) {
    try { fs.rmSync(temporario, { force: true }); } catch (e2) { /* nada a fazer */ }
    return false;
  }
}

module.exports = { VERSAO, MAX_ROTAS, VALIDADE_MS, ler, vazio, registrar, pontuar, ordenar, gravar, instante };
