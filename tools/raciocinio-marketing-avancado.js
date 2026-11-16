// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧠 RACIOCÍNIO LOCAL AVANÇADO PARA MARKETING
// Cálculos exatos sem API: CAC, LTV, churn, CTR, funil, viral, payback, sazonalidade.
// Zero custo, sem rede, sem dependência de modelos de IA para matemática.
// Só serve marketing de Prancheta e Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) {
  fs.mkdirSync(MARKETING_DIR, { recursive: true });
}

const ARQUIVO_DADOS = path.join(MARKETING_DIR, 'dados-marketing.json');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ARMAZENAMENTO DE DADOS DE MARKETING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let cacheDados = null;
function carregarDados() {
  if (cacheDados) return cacheDados;
  try {
    if (fs.existsSync(ARQUIVO_DADOS)) {
      cacheDados = JSON.parse(fs.readFileSync(ARQUIVO_DADOS, 'utf8'));
      return cacheDados;
    }
  } catch (e) {}
  cacheDados = {
    inscritos: [],      // { quando, quantidade, rede }
    downloads: [],      // { quando, quantidade, campanha, jogo }
    cliques: [],        // { quando, quantidade, link, fonte }
    impressoes: [],     // { quando, quantidade, rede, post }
    gastosTempo: [],    // { quando, horas, atividade }
    receita: [],        // { quando, valor, origem }
    churn: [],          // { quando, usuariosPerdidos, usuariosTotais }
    viral: [],          // { quando, novosUsuarios, usuariosExistentes }
    sazonalidade: [],   // { quando, mes, diaSemana, hora, metrica, valor }
    atualizadoEm: new Date().toISOString(),
  };
  return cacheDados;
}
function salvarDados() {
  try {
    cacheDados.atualizadoEm = new Date().toISOString();
    fs.writeFileSync(ARQUIVO_DADOS, JSON.stringify(cacheDados, null, 2), 'utf8');
  } catch (e) {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. CAC — CUSTO DE AQUISIÇÃO POR CLIENTE
// Gasto de tempo ÷ novos usuários adquiridos
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calcularCAC(gastoTempoHoras, novosUsuarios, valorHora = 0) {
  const gastoTotal = gastoTempoHoras * valorHora; // R$ 0 se valorHora = 0 (tempo voluntário)
  if (novosUsuarios <= 0) return { cac: null, motivo: 'nenhum novo usuário para dividir' };
  const cac = gastoTotal / novosUsuarios;
  return {
    ferramenta: 'marketing-cac',
    texto: 'CAC: R$ ' + cac.toFixed(2) + ' por usuário adquirido' +
           (valorHora > 0 ? '' : ' (custo de tempo voluntário = R$ 0)'),
    dados: { gastoTotal, novosUsuarios, valorHora, cac },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. LTV — LIFETIME VALUE
// Receita média por usuário × tempo médio de retenção
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calcularLTV(receitaTotal, usuariosTotais, diasRetencaoMedia) {
  if (usuariosTotais <= 0) return { ltv: null, motivo: 'nenhum usuário para dividir' };
  const receitaPorUsuario = receitaTotal / usuariosTotais;
  const ltv = receitaPorUsuario * (diasRetencaoMedia / 30); // normalizado para mensal
  return {
    ferramenta: 'marketing-ltv',
    texto: 'LTV: R$ ' + ltv.toFixed(2) + ' por usuário (vida útil)',
    dados: { receitaPorUsuario, usuariosTotais, diasRetencaoMedia, ltv },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. CHURN RATE — TAXA DE ABANDONO
// Usuários perdidos ÷ total de usuários
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calcularChurn(usuariosPerdidos, usuariosTotais, periodoDias = 30) {
  if (usuariosTotais <= 0) return { churn: null, motivo: 'nenhum usuário total para dividir' };
  const taxa = (usuariosPerdidos / usuariosTotais) * 100;
  const anualizada = taxa * (365 / periodoDias);
  return {
    ferramenta: 'marketing-churn',
    texto: 'Churn: ' + taxa.toFixed(2) + '% em ' + periodoDias + ' dias (' +
           anualizada.toFixed(2) + '% anualizada)',
    dados: { usuariosPerdidos, usuariosTotais, periodoDias, taxa, anualizada },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. CTR — CLICK-THROUGH RATE
// Cliques ÷ impressões × 100
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calcularCTR(cliques, impressoes) {
  if (impressoes <= 0) return { ctr: null, motivo: 'nenhuma impressão para dividir' };
  const taxa = (cliques / impressoes) * 100;
  return {
    ferramenta: 'marketing-ctr',
    texto: 'CTR: ' + taxa.toFixed(2) + '% (' + cliques + '/' + impressoes + ')',
    dados: { cliques, impressoes, taxa },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. FUNIL DE CONVERSÃO
// Visão → Clique → Download → Instalação → Jogar → Reter
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function analisarFunil(etapas) {
  // etapas: { impressoes, cliques, downloads, instalacoes, jogaram, reteram }
  const e = etapas || {};
  const funil = [];

  if (e.impressoes && e.impressoes > 0) {
    funil.push({ etapa: 'Impressões', valor: e.impressoes, pct: 100 });
  }
  if (e.cliques && e.cliques > 0 && e.impressoes) {
    funil.push({ etapa: 'Cliques', valor: e.cliques, pct: ((e.cliques / e.impressoes) * 100).toFixed(1) });
  }
  if (e.downloads && e.downloads > 0 && e.cliques) {
    funil.push({ etapa: 'Downloads', valor: e.downloads, pct: ((e.downloads / e.cliques) * 100).toFixed(1) });
  }
  if (e.instalacoes && e.instalacoes > 0 && e.downloads) {
    funil.push({ etapa: 'Instalações', valor: e.instalacoes, pct: ((e.instalacoes / e.downloads) * 100).toFixed(1) });
  }
  if (e.jogaram && e.jogaram > 0 && e.instalacoes) {
    funil.push({ etapa: 'Jogaram', valor: e.jogaram, pct: ((e.jogaram / e.instalacoes) * 100).toFixed(1) });
  }
  if (e.reteram && e.reteram > 0 && e.jogaram) {
    funil.push({ etapa: 'Reteram (dia 7)', valor: e.reteram, pct: ((e.reteram / e.jogaram) * 100).toFixed(1) });
  }

  // Encontrar onde mais cai (gargalo)
  let gargalo = null;
  let maiorQueda = 0;
  for (let i = 1; i < funil.length; i++) {
    const queda = parseFloat(funil[i-1].pct) - parseFloat(funil[i].pct);
    if (queda > maiorQueda) {
      maiorQueda = queda;
      gargalo = funil[i].etapa;
    }
  }

  return {
    ferramenta: 'marketing-funil',
    texto: 'Funil: ' + funil.map(f => f.etapa + ' ' + f.valor + ' (' + f.pct + '%)').join(' → ') +
           (gargalo ? ' | Gargalo: ' + gargalo + ' (queda de ' + maiorQueda.toFixed(1) + '%)' : ''),
    dados: { funil, gargalo, maiorQueda },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. COEFICIENTE VIRAL
// Novos usuários ÷ usuários existentes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calcularViral(novosUsuarios, usuariosExistentes) {
  if (usuariosExistentes <= 0) return { viral: null, motivo: 'nenhum usuário existente para dividir' };
  const coeficiente = novosUsuarios / usuariosExistentes;
  const status = coeficiente >= 1 ? 'crescimento viral' :
                 coeficiente >= 0.5 ? 'crescimento estável' :
                 coeficiente >= 0.2 ? 'crescimento lento' : 'declínio';
  return {
    ferramenta: 'marketing-viral',
    texto: 'Coeficiente viral: ' + coeficiente.toFixed(2) + ' — ' + status,
    dados: { novosUsuarios, usuariosExistentes, coeficiente, status },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. TEMPO DE PAYBACK
// Gasto ÷ receita diária = dias para recuperar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calcularPayback(gastoTotal, receitaDiaria) {
  if (receitaDiaria <= 0) return { payback: null, motivo: 'sem receita diária para calcular' };
  const dias = gastoTotal / receitaDiaria;
  return {
    ferramenta: 'marketing-payback',
    texto: 'Payback: ' + Math.ceil(dias) + ' dias para recuperar o investimento',
    dados: { gastoTotal, receitaDiaria, dias },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. SAZONALIDADE
// Comparação de métrica por período (mês, dia da semana, hora)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function analisarSazonalidade(metrica, periodo = 'mes') {
  const dados = carregarDados();
  const registros = dados.sazonalidade.filter(s => s.metrica === metrica);
  if (registros.length === 0) {
    return {
      ferramenta: 'marketing-sazonalidade',
      texto: 'Sem dados de sazonalidade para: ' + metrica,
      dados: null,
    };
  }

  const grupos = {};
  for (const r of registros) {
    let chave;
    if (periodo === 'mes') chave = r.mes;
    else if (periodo === 'diaSemana') chave = r.diaSemana;
    else if (periodo === 'hora') chave = r.hora;
    else chave = r.quando.slice(0, 7); // YYYY-MM
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(r.valor);
  }

  const medias = {};
  for (const [chave, valores] of Object.entries(grupos)) {
    medias[chave] = valores.reduce((a, b) => a + b, 0) / valores.length;
  }

  const chaves = Object.keys(medias);
  const melhor = chaves.reduce((a, b) => medias[a] > medias[b] ? a : b);
  const pior = chaves.reduce((a, b) => medias[a] < medias[b] ? a : b);

  return {
    ferramenta: 'marketing-sazonalidade',
    texto: 'Sazonalidade de ' + metrica + ' por ' + periodo + ': melhor=' + melhor +
           ' (' + medias[melhor].toFixed(1) + ') · pior=' + pior +
           ' (' + medias[pior].toFixed(1) + ')',
    dados: { medias, melhor, pior, periodo, metrica },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. PROJEÇÃO DE CRESCIMENTO
// Projeta inscritos/downloads baseado em taxa histórica
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function projetarCrescimento(atual, taxaDiariaPct, dias) {
  if (atual <= 0) return { projetado: null, motivo: 'valor inicial inválido' };
  const taxa = taxaDiariaPct / 100;
  const projetado = Math.round(atual * Math.pow(1 + taxa, dias));
  const ganho = projetado - atual;
  return {
    ferramenta: 'marketing-projecao',
    texto: 'Em ' + dias + ' dias: ' + projetado.toLocaleString('pt-BR') +
           ' (ganho de ' + ganho.toLocaleString('pt-BR') + ')',
    dados: { atual, taxaDiariaPct, dias, projetado, ganho },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. ROI DE MARKETING (TEMPO)
// Receita ÷ gasto de tempo
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calcularROI(receita, horasGastas, valorHora = 0) {
  const custo = horasGastas * valorHora;
  if (custo <= 0) {
    return { roi: null, motivo: 'custo zero — não é possível calcular ROI sem custo' };
  }
  const roi = ((receita - custo) / custo) * 100;
  return {
    ferramenta: 'marketing-roi',
    texto: 'ROI: ' + roi.toFixed(1) + '% (receita R$ ' + receita.toFixed(2) +
           ' vs custo R$ ' + custo.toFixed(2) + ')',
    dados: { receita, horasGastas, valorHora, custo, roi },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 11. REGISTRAR DADO DE MARKETING
// Salva métrica para histórico e sazonalidade
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function registrarMetrica(tipo, valor, contexto = {}) {
  const dados = carregarDados();
  const entrada = { quando: new Date().toISOString(), valor, ...contexto };

  switch (tipo) {
    case 'inscritos': dados.inscritos.push(entrada); break;
    case 'downloads': dados.downloads.push(entrada); break;
    case 'cliques': dados.cliques.push(entrada); break;
    case 'impressoes': dados.impressoes.push(entrada); break;
    case 'gastosTempo': dados.gastosTempo.push(entrada); break;
    case 'receita': dados.receita.push(entrada); break;
    case 'churn': dados.churn.push(entrada); break;
    case 'viral': dados.viral.push(entrada); break;
    case 'sazonalidade': dados.sazonalidade.push(entrada); break;
    default: return { ok: false, motivo: 'tipo desconhecido: ' + tipo };
  }

  // Manter apenas os últimos 1000 de cada tipo
  for (const key of Object.keys(dados)) {
    if (Array.isArray(dados[key]) && dados[key].length > 1000) {
      dados[key] = dados[key].slice(-1000);
    }
  }

  cacheDados = dados;
  salvarDados();
  return { ok: true, tipo, valor };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 12. RESUMO DE MÉTRICAS DE MARKETING
// Visão geral de todas as métricas registradas
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function resumoMetricas() {
  const dados = carregarDados();
  const resumo = {};

  for (const [tipo, registros] of Object.entries(dados)) {
    if (tipo === 'atualizadoEm' || !Array.isArray(registros)) continue;
    if (registros.length === 0) {
      resumo[tipo] = { total: 0, ultimo: null };
      continue;
    }
    const valores = registros.map(r => r.valor).filter(v => typeof v === 'number');
    const ultimo = registros[registros.length - 1];
    resumo[tipo] = {
      total: registros.length,
      soma: valores.length > 0 ? valores.reduce((a, b) => a + b, 0) : 0,
      media: valores.length > 0 ? (valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(2) : 0,
      ultimo: ultimo ? { quando: ultimo.quando, valor: ultimo.valor } : null,
    };
  }

  return resumo;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROCESSAR PERGUNTA DE MARKETING AVANÇADO
// Detecta qual cálculo aplicar com base na pergunta
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function processarPerguntaMarketing(pergunta) {
  if (!pergunta) return null;
  const t = pergunta.toLowerCase();

  // CAC
  const m1 = t.match(/cac|custo de aquisição|quanto custa conquistar|gasto.*(\d+(?:[.,]\d+)?)\s*hora.*(\d+(?:[.,]\d+)?)\s*usuario/);
  if (m1 && /cac|custo de aquisição|quanto custa conquistar/.test(t)) {
    const horas = parseFloat((t.match(/(\d+(?:[.,]\d+)?)\s*hora/) || [0, 0])[1].replace(',', '.')) || 0;
    const usuarios = parseFloat((t.match(/(\d+(?:[.,]\d+)?)\s*usuario/) || [0, 0])[1].replace(',', '.')) || 0;
    return calcularCAC(horas, usuarios);
  }

  // LTV
  if (/ltv|lifetime value|valor vitalício|vida útil/.test(t)) {
    const receita = parseFloat((t.match(/receita.*?(\d+(?:[.,]\d+)?)/) || [0, 0])[1].replace(',', '.')) || 0;
    const usuarios = parseFloat((t.match(/(\d+(?:[.,]\d+)?)\s*usuario/) || [0, 0])[1].replace(',', '.')) || 0;
    const dias = parseInt((t.match(/(\d+)\s*dia/) || [0, 0])[1]) || 30;
    return calcularLTV(receita, usuarios, dias);
  }

  // Churn
  if (/churn|abandono|taxa de perda|perdeu.*usuario/.test(t)) {
    const perdidos = parseFloat((t.match(/perdeu.*?(\d+(?:[.,]\d+)?)/) || [0, 0])[1].replace(',', '.')) || 0;
    const totais = parseFloat((t.match(/total.*?(\d+(?:[.,]\d+)?)/) || [0, 0])[1].replace(',', '.')) || 0;
    const dias = parseInt((t.match(/(\d+)\s*dia/) || [0, 0])[1]) || 30;
    return calcularChurn(perdidos, totais, dias);
  }

  // CTR
  if (/ctr|click.through|taxa de clique|clique.*impressao/.test(t)) {
    const cliques = parseFloat((t.match(/(\d+(?:[.,]\d+)?)\s*clique/) || [0, 0])[1].replace(',', '.')) || 0;
    const impressoes = parseFloat((t.match(/(\d+(?:[.,]\d+)?)\s*impress/) || [0, 0])[1].replace(',', '.')) || 0;
    return calcularCTR(cliques, impressoes);
  }

  // Funil
  if (/funil|etapa.*conversao|gargalo/.test(t)) {
    return analisarFunil({
      impressoes: parseFloat((t.match(/impress.*?(\d+)/) || [0, 0])[1]) || undefined,
      cliques: parseFloat((t.match(/clique.*?(\d+)/) || [0, 0])[1]) || undefined,
      downloads: parseFloat((t.match(/download.*?(\d+)/) || [0, 0])[1]) || undefined,
      instalacoes: parseFloat((t.match(/instal.*?(\d+)/) || [0, 0])[1]) || undefined,
      jogaram: parseFloat((t.match(/jogar.*?(\d+)/) || [0, 0])[1]) || undefined,
      reteram: parseFloat((t.match(/reter.*?(\d+)/) || [0, 0])[1]) || undefined,
    });
  }

  // Viral
  if (/viral|coeficiente viral|indicação|convite/.test(t)) {
    const novos = parseFloat((t.match(/novos.*?(\d+(?:[.,]\d+)?)/) || [0, 0])[1].replace(',', '.')) || 0;
    const existentes = parseFloat((t.match(/existentes.*?(\d+(?:[.,]\d+)?)/) || [0, 0])[1].replace(',', '.')) || 0;
    return calcularViral(novos, existentes);
  }

  // Payback
  if (/payback|recuperar|dias para|break.even.time/.test(t)) {
    const gasto = parseFloat((t.match(/gasto.*?(\d+(?:[.,]\d+)?)/) || [0, 0])[1].replace(',', '.')) || 0;
    const receitaDia = parseFloat((t.match(/receita.*?dia.*?(\d+(?:[.,]\d+)?)/) || [0, 0])[1].replace(',', '.')) || 0;
    return calcularPayback(gasto, receitaDia);
  }

  // Sazonalidade
  if (/sazonal|melhor mes|melhor dia|melhor hora|periodo/.test(t)) {
    const metrica = (t.match(/de\s+(\w+)/) || [])[1] || 'downloads';
    const periodo = t.match(/hora/) ? 'hora' : (t.match(/dia/) ? 'diaSemana' : 'mes');
    return analisarSazonalidade(metrica, periodo);
  }

  // Projeção
  if (/projet|preve|futuro|proximo|próximo|em.*dias/.test(t)) {
    const atual = parseFloat((t.match(/(\d+(?:[.,]\d+)?)\s*(?:inscritos|downloads|usuarios)/) || [0, 0])[1].replace(',', '.')) || 0;
    const taxa = parseFloat((t.match(/(\d+(?:[.,]\d+)?)%\s*ao\s*dia/) || [0, 0])[1].replace(',', '.')) || 0;
    const dias = parseInt((t.match(/(\d+)\s*dias?/) || [0, 0])[1]) || 30;
    return projetarCrescimento(atual, taxa, dias);
  }

  // ROI
  if (/roi|retorno|retorno sobre|investimento/.test(t)) {
    const receita = parseFloat((t.match(/receita.*?(\d+(?:[.,]\d+)?)/) || [0, 0])[1].replace(',', '.')) || 0;
    const horas = parseFloat((t.match(/(\d+(?:[.,]\d+)?)\s*hora/) || [0, 0])[1].replace(',', '.')) || 0;
    const valorHora = parseFloat((t.match(/valor.*?hora.*?(\d+(?:[.,]\d+)?)/) || [0, 0])[1].replace(',', '.')) || 0;
    return calcularROI(receita, horas, valorHora);
  }

  return null;
}

module.exports = {
  // Cálculos
  calcularCAC,
  calcularLTV,
  calcularChurn,
  calcularCTR,
  analisarFunil,
  calcularViral,
  calcularPayback,
  analisarSazonalidade,
  projetarCrescimento,
  calcularROI,
  // Dados
  registrarMetrica,
  carregarDados,
  salvarDados,
  resumoMetricas,
  ARQUIVO_DADOS,
  // Processamento
  processarPerguntaMarketing,
};