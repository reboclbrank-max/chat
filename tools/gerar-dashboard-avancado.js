#!/usr/bin/env node
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 GERAR DASHBOARD DE MARKETING AVANÇADO
// Gera dados JSON e HTML do dashboard com métricas em tempo real.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const D = require('./dashboard-marketing-avancado');
const fs = require('fs');
const path = require('path');

const dados = D.gerarDadosDashboard();
const salvo = D.salvarDashboard(dados);

const html = D.gerarHTMLDashboard(dados);
const htmlArquivo = path.join(__dirname, '..', 'posts', 'marketing', 'dashboard-avancado.html');
fs.writeFileSync(htmlArquivo, html, 'utf8');

console.log('📊 Dashboard de Marketing gerado:');
console.log('  • Dados: ' + (salvo.ok ? salvo.arquivo : 'ERRO: ' + salvo.erro));
console.log('  • HTML: ' + htmlArquivo);
console.log('  • Inscritos: ' + dados.resumo.totalInscritos);
console.log('  • Downloads: ' + dados.resumo.totalDownloads);
console.log('  • CTR: ' + dados.resumo.ctr.toFixed(2) + '%');
console.log('  • Conversão: ' + dados.resumo.conversao.toFixed(2) + '%');
console.log('  • Alertas: ' + dados.alertas.length);
console.log('  • Recomendações: ' + dados.recomendacoes.length);
console.log('✅ Concluído em ' + new Date().toISOString());