// 🧪 MEDIDOR DE CÓDIGO (rodada 94) — a prova mais objetiva que existe sem chave paga:
// o chat escreve a função, o medidor RODA a função contra testes de verdade.
// Cada item vira um arquivo temporário; o teste roda em processo separado, com tempo limite.
//
//   node medir-codigo.js gratis            # caminho novo (tipo 'codigo': sem consenso, até 1600 tokens)
//   MODO=antes node medir-codigo.js gratis # como era antes (consenso de 3, 400 tokens)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const MODO = process.env.MODO === 'antes' ? 'antes' : 'depois';
const CONC = Number(process.env.CONC || 1);
const banco = require('./banco-codigo.json');
const { Roteador, internos } = require(path.resolve(__dirname, '..', 'roteador-ia.js'));

function rodarTeste(codigo, testes, nome) {
  if (!codigo) return { ok: false, motivo: 'sem código reconhecível' };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cod-'));
  const alvo = path.join(dir, 'alvo.js');
  // exporta a função pedida mesmo que o modelo tenha esquecido o module.exports:
  // a prova é a função estar certa, não o estilo de exportação
  fs.writeFileSync(alvo, codigo + '\n\n' +
    'try { module.exports = Object.assign({}, module.exports);' +
    ' if (typeof ' + nome + ' === "function") module.exports.' + nome + ' = ' + nome + ';' +
    ' } catch (e) {}');
  const prova = path.join(dir, 'prova.js');
  fs.writeFileSync(prova, 'process.on("unhandledRejection", e => { throw e; });\n' + testes);
  const r = spawnSync('node', [prova], { cwd: dir, encoding: 'utf8', timeout: 8000 });
  const saida = String(r.stdout || '') + String(r.stderr || '');
  const ok = r.status === 0 && /ok/.test(saida);
  return { ok, motivo: ok ? 'teste passou' : (saida.split('\n').filter((l) => /Error|error/.test(l))[0] || saida.slice(0, 160)).trim() };
}

(async () => {
  const r = new Roteador();
  const res = [];
  for (let i = 0; i < banco.length; i += CONC) {
    const bloco = banco.slice(i, i + CONC);
    const feitos = await Promise.all(bloco.map(async (it) => {
      const t0 = Date.now();
      const pedido = MODO === 'antes'
        ? { pergunta: it.q, tipo: 'curto', dificuldade: 'media' }
        : { pergunta: it.q, tipo: 'codigo', dificuldade: 'media' };
      let o;
      try { o = await r.responder(pedido); } catch (e) { o = { texto: null, erro: String(e && e.message) }; }
      const codigo = o && o.texto ? internos.extrairCodigo(o.texto) : '';
      const inteiro = internos.codigoInteiro(codigo);
      const prova = rodarTeste(codigo, it.testes, it.nome);
      return {
        id: it.id, nome: it.nome, ok: prova.ok, temCodigo: !!codigo, inteiro,
        motivo: prova.motivo, erro: o && o.erro || null, ms: Date.now() - t0,
        tokens: o && o.nota != null ? o.nota : null, trecho: String((o && o.texto) || '').slice(0, 220)
      };
    }));
    feitos.forEach((f) => { res.push(f); console.log((f.ok ? '✔' : '✘') + ' ' + f.nome.padEnd(16) + ' ' + (f.ms + 'ms').padStart(7) + '  ' + (f.ok ? 'passou' : f.motivo.slice(0, 90))); });
  }
  const ok = res.filter((x) => x.ok).length;
  const sum = {
    modo: MODO, total: res.length, passaram: ok, pct: Math.round((ok / res.length) * 1000) / 10,
    comCodigo: res.filter((x) => x.temCodigo).length,
    codigoInteiro: res.filter((x) => x.inteiro).length,
    medianaMs: res.map((x) => x.ms).sort((a, b) => a - b)[Math.floor(res.length / 2)]
  };
  const arquivo = path.join(__dirname, 'resultado-codigo-' + MODO + '.json');
  fs.writeFileSync(arquivo, JSON.stringify({ sum, res }, null, 1));
  console.log('\n' + JSON.stringify(sum));
  console.log('salvo em ' + arquivo);
})();
