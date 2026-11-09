// 🧪 TESTAR TODAS AS REDES SOCIAIS — verifica credenciais e tenta postar
// v1 (09/11/2026): testa cada rede social com suas credenciais do cofre.
// Todas as chamadas são de LEITURA (exceto quando explicitly pedido para postar).
// Registra sucesso/falha com motivo e números.

const redes = require('./redes-sociais');
const cofre = require('./cofre-seguro');

const NL = '\n';

async function main() {
  console.log('🧪 Iniciando teste de todas as redes sociais...' + NL);

  // 1. Status geral do cofre
  console.log('📋 Status do cofre:');
  const status = cofre.statusGeral();
  let configurados = 0;
  let naoConfigurados = 0;
  for (const [servico, ok] of Object.entries(status)) {
    const marca = ok ? '✅' : '❌';
    console.log(`  ${marca} ${servico}`);
    if (ok) configurados++;
    else naoConfigurados++;
  }
  console.log(`  Total: ${configurados} configurados, ${naoConfigurados} não configurados${NL}`);

  // 2. Testar cada rede individualmente
  console.log('🔍 Testando cada rede:');

  // GitHub
  const r1 = await redes.postarGitHub('Teste de conectividade do cofre seguro — 09/11/2026', 'Teste: conectividade');
  console.log(`  ${r1.sucesso ? '✅' : '❌'} GitHub: ${r1.detalhe}`);

  // YouTube (medição)
  const r2 = await redes.medirYoutube();
  console.log(`  ${r2.sucesso ? '✅' : '❌'} YouTube: ${r2.detalhe}`);

  // Bluesky (apenas login, não posta)
  const r3 = await redes.postarBluesky('Teste de conectividade — 09/11/2026', null, null);
  console.log(`  ${r3.sucesso ? '✅' : '❌'} Bluesky: ${r3.detalhe}`);

  // Mastodon (apenas login/verificação)
  const r4 = await redes.postarMastodon('Teste de conectividade — 09/11/2026', null, null, null);
  console.log(`  ${r4.sucesso ? '✅' : '❌'} Mastodon: ${r4.detalhe}`);

  // Instagram
  const r5 = await redes.postarInstagram('Teste de conectividade — 09/11/2026', null);
  console.log(`  ${r5.sucesso ? '✅' : '❌'} Instagram: ${r5.detalhe}`);

  // Threads
  const r6 = await redes.postarThreads('Teste de conectividade — 09/11/2026', null);
  console.log(`  ${r6.sucesso ? '✅' : '❌'} Threads: ${r6.detalhe}`);

  // Discord
  const r7 = await redes.postarDiscord(null, 'Teste de conectividade');
  console.log(`  ${r7.sucesso ? '✅' : '❌'} Discord: ${r7.detalhe}`);

  // dev.to
  const r8 = await redes.postarDevto('Teste de conectividade', 'Teste do cofre seguro — 09/11/2026', ['teste']);
  console.log(`  ${r8.sucesso ? '✅' : '❌'} dev.to: ${r8.detalhe}`);

  // Tumblr
  const r9 = await redes.postarTumblr('Teste de conectividade', 'Teste do cofre seguro — 09/11/2026', ['teste']);
  console.log(`  ${r9.sucesso ? '✅' : '❌'} Tumblr: ${r9.detalhe}`);

  // Nostr
  const r10 = await redes.postarNostr('Teste de conectividade — 09/11/2026');
  console.log(`  ${r10.sucesso ? '✅' : '❌'} Nostr: ${r10.detalhe}`);

  // Pinterest
  const r11 = await redes.postarPinterest('Teste', 'Teste de conectividade', null, null);
  console.log(`  ${r11.sucesso ? '✅' : '❌'} Pinterest: ${r11.detalhe}`);

  // Gmail
  const r12 = await redes.enviarGmail(null, 'Teste de conectividade', 'Teste do cofre seguro — 09/11/2026');
  console.log(`  ${r12.sucesso ? '✅' : '❌'} Gmail: ${r12.detalhe}`);

  // 3. Relatório final
  const rel = redes.relatorio();
  console.log(NL + '════════════════════════════════════════════════════════════════════════════════━━');
  console.log(`📊 Relatório: ${rel.sucessos}/${rel.total} redes funcionando`);
  console.log(`   Sucessos: ${rel.sucessos} | Falhas: ${rel.falhas}`);
  for (const [servico, s] of Object.entries(rel.porServico)) {
    const marca = s.falhas === 0 ? '✅' : '❌';
    console.log(`   ${marca} ${servico}: ${s.sucessos}/${s.total}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (rel.falhas > 0) {
    console.log(NL + '⚠️  Redes com falha (motivo):');
    for (const p of rel.ultimas) {
      if (!p.sucesso) {
        console.log(`   • ${p.servico}: ${p.detalhe}`);
      }
    }
    process.exitCode = 1;
  } else {
    console.log(NL + '✅ Todas as redes sociais com credencial configurada estão funcionando!');
  }
}

main().catch(e => {
  console.error('Erro fatal:', e.message);
  process.exitCode = 2;
});
