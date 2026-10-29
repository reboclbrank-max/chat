// Compara o gabarito histórico com as correções auditadas, nas MESMAS respostas salvas.
// Uso: node bench/reavaliar-aberto.js resultado-a.json resultado-b.json [--json]
// Isto não executa modelos nem demonstra melhoria do gerador.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { avaliar } = require('./avaliar-aberto.js');
const historico = require('./banco-aberto-antes-100.json');
const corrigido = require('./banco-aberto.json');
const hash = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

function resumir(res, banco) {
  const lista = res.map((item) => {
    const it = banco.find((q) => q.id === item.id);
    if (!it) throw new Error('item desconhecido: ' + item.id);
    return { id: item.id, ...avaliar(item.texto, it) };
  });
  return { total: lista.length, passaram: lista.filter((x) => x.ok).length,
    falhas: lista.filter((x) => !x.ok).map((x) => ({ id: x.id, falhas: x.falhas })) };
}
function processar(nome) {
  const arquivo = path.resolve(nome);
  const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const lista = dados.res || dados.resultados;
  if (!Array.isArray(lista)) throw new Error('arquivo sem lista res: ' + nome);
  const original = resumir(lista, historico);
  const novo = resumir(lista, corrigido);
  const anterior = new Set(original.falhas.map((x) => x.id));
  const posterior = new Set(novo.falhas.map((x) => x.id));
  const alterados = lista.map((x) => x.id).filter((id) => anterior.has(id) !== posterior.has(id));
  return { arquivo: path.basename(arquivo), sha256: hash(arquivo), gravadoOriginal: dados.sum,
    pontuacaoHistorica: original, pontuacaoCorrigida: novo, itensComMudancaDeResultado: alterados };
}
function main() {
  const args = process.argv.slice(2);
  const arquivos = args.filter((x) => x !== '--json');
  if (!arquivos.length) throw new Error('informe pelo menos um arquivo de respostas');
  const resultados = arquivos.map(processar);
  if (args.includes('--json')) console.log(JSON.stringify({
    aviso: 'Reavaliação do MESMO texto; não é uma nova geração nem avalia verdade ou qualidade literária.',
    gabaritoHistoricoSha256: hash(path.join(__dirname, 'banco-aberto-antes-100.json')),
    gabaritoCorrigidoSha256: hash(path.join(__dirname, 'banco-aberto.json')), resultados }, null, 2));
  else resultados.forEach((r) => {
    console.log(r.arquivo + ': histórico ' + r.pontuacaoHistorica.passaram + '/' + r.pontuacaoHistorica.total +
      '; corrigido ' + r.pontuacaoCorrigida.passaram + '/' + r.pontuacaoCorrigida.total +
      '; alterados: ' + (r.itensComMudancaDeResultado.join(', ') || 'nenhum'));
    console.log('  falhas restantes: ' + r.pontuacaoCorrigida.falhas.map((x) => '#' + x.id + ' ' + x.falhas.join(', ')).join(' | '));
  });
}
if (require.main === module) try { main(); } catch (e) { console.error(e.message); process.exitCode = 1; }
module.exports = { resumir, processar };
