// 🧪 v12.18: comandos novos — conta: (100% local/offline), ajuda atualizado e hora: intacto. Sem rede e sem motor.
const CHAT = require(require('path').resolve(process.argv[2]));
let ok = 0, total = 0;
const falhas = [];
async function t(nome, entrada, re) {
  total++;
  try {
    const r = await CHAT.ferramenta(entrada);
    if (re.test(String(r || ''))) ok++; else falhas.push(nome + ' → ' + String(r).slice(0, 120));
  } catch (e) { falhas.push(nome + ' → ERRO ' + String(e.message || e).slice(0, 80)); }
}
(async () => {
  await t('conta: parênteses + decimal com vírgula', 'conta: (1250*0,15)+80', /267,5/);
  await t('conta: x como vezes', 'conta: 7x8', /56/);
  await t('conta: potência', 'conta: 2^10', /1\.024/);
  await t('conta: porcentagem', 'conta: 20% de 150', /30/);
  await t('conta: divisão', 'conta: 10/4', /2,5/);
  await t('conta: milhar pt-BR', 'conta: 1.250+100', /1\.350/);
  await t('conta: calc: apelido', 'calc: 5*5', /25/);
  await t('conta: lixo → ajuda amigável (não inventa)', 'conta: banana', /Não consegui ler/);
  await t('conta: divisão por zero → ajuda amigável', 'conta: 1/0', /Não consegui ler/);
  await t('conta: vazia → ajuda amigável', 'conta:', /Não consegui ler/);
  await t('ajuda: lista o comando conta:', 'ajuda', /conta:/);
  await t('ajuda: lista feriado: e cep:', 'comandos', /feriado:|cep:/);
  await t('hora: segue no ar', 'hora: brasilia', /🕐/);
  for (const f of falhas) console.log('✘ ' + f);
  console.log(ok + '/' + total + ' certos');
  if (ok !== total) process.exitCode = 1;
})();
