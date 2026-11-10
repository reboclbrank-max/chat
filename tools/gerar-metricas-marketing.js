// 📊 GERAR MÉTRICAS DE MARKETING
// Lê os backups de publicação e gera resumo para o dashboard
// Rode periodicamente (ex: via workflow diário) para atualizar o dashboard

const fs = require('fs');
const path = require('path');

const PUBLICADOS_DIR = path.join(__dirname, '..', 'posts', 'publicados');
const SAIDA = path.join(__dirname, '..', 'posts', 'marketing', 'metricas-resumo.json');

function lerPublicacoes() {
  const publicacoes = [];
  if (!fs.existsSync(PUBLICADOS_DIR)) return publicacoes;
  const arquivos = fs.readdirSync(PUBLICADOS_DIR).filter(f => f.endsWith('.json'));
  for (const arq of arquivos) {
    try {
      const conteudo = JSON.parse(fs.readFileSync(path.join(PUBLICADOS_DIR, arq), 'utf8'));
      publicacoes.push(conteudo);
    } catch (e) {}
  }
  return publicacoes;
}

function gerarResumo(publicacoes) {
  const porServico = {};
  const porFormato = {};
  let total = 0, sucessos = 0, falhas = 0;

  for (const p of publicacoes) {
    total++;
    if (p.sucesso) sucessos++; else falhas++;

    if (!porServico[p.servico]) porServico[p.servico] = { total: 0, sucessos: 0, falhas: 0 };
    porServico[p.servico].total++;
    if (p.sucesso) porServico[p.servico].sucessos++; else porServico[p.servico].falhas++;

    const fmt = p.formato || 'post';
    if (!porFormato[fmt]) porFormato[fmt] = { total: 0, sucessos: 0 };
    porFormato[fmt].total++;
    if (p.sucesso) porFormato[fmt].sucessos++;
  }

  const redesAtivas = Object.keys(porServico).filter(s => porServico[s].total > 0).length;

  return {
    geradoEm: new Date().toISOString(),
    total,
    sucessos,
    falhas,
    redesAtivas,
    porServico: Object.entries(porServico).map(([servico, d]) => ({
      servico,
      ...d,
      taxaSucesso: d.total > 0 ? Math.round((d.sucessos / d.total) * 100) : 0
    })),
    porFormato: Object.entries(porFormato).map(([fmt, d]) => ({
      formato: fmt,
      ...d,
      taxaSucesso: d.total > 0 ? Math.round((d.sucessos / d.total) * 100) : 0
    }))
  };
}

const publicacoes = lerPublicacoes();
const resumo = gerarResumo(publicacoes);

fs.writeFileSync(SAIDA, JSON.stringify(resumo, null, 2), 'utf8');

console.log(`📊 Métricas geradas: ${resumo.total} publicações, ${resumo.sucessos} sucessos, ${resumo.falhas} falhas`);
console.log(`💾 Salvo em: ${SAIDA}`);

// Imprimir resumo por rede
for (const r of resumo.porServico) {
  console.log(`  ${r.servico}: ${r.total} posts, ${r.sucessos} OK, ${r.falhas} falhas (${r.taxaSucesso}%)`);
}
