// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📤 EXPORTAÇÃO DE DADOS — CSV e JSON para análise externa
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });

function exportarJSON(dados, nomeArquivo) {
  const arquivo = path.join(MARKETING_DIR, nomeArquivo || `export-${Date.now()}.json`);
  try {
    fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2), 'utf8');
    return { ok: true, arquivo };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}

function exportarCSV(dados, nomeArquivo, colunas) {
  const arquivo = path.join(MARKETING_DIR, nomeArquivo || `export-${Date.now()}.csv`);
  try {
    const cabecalho = (colunas || Object.keys(dados[0] || {})).join(',');
    const linhas = dados.map(row => colunas.map(col => {
      const v = row[col];
      return v != null ? String(v).replace(/,/g, ';') : '';
    }).join(','));
    const csv = [cabecalho, ...linhas].join('\n');
    fs.writeFileSync(arquivo, csv, 'utf8');
    return { ok: true, arquivo };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}

module.exports = { exportarJSON, exportarCSV, MARKETING_DIR };