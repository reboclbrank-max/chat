// Gera bench/local-sem-api.html: mede o CÉREBRO LOCAL (WebLLM/WebGPU) na MESMA régua
// da comparação pareada de 102 (24 originais + 6 holdout + 6 novos + 8 repetições = 44),
// usando a MESMA rubrica de bench/avaliar-aberto.js. Sem API, sem chave, sem cota.
// A rubrica é injetada a partir do arquivo real — não é cópia manual.
'use strict';
const fs = require('fs');
const path = require('path');

const BENCH = path.join(__dirname, '..', 'bench');
const bancos = {
  original: JSON.parse(fs.readFileSync(path.join(BENCH, 'banco-aberto-antes-100.json'), 'utf8')),
  holdout: JSON.parse(fs.readFileSync(path.join(BENCH, 'banco-aberto-holdout-100.json'), 'utf8')),
  novo: JSON.parse(fs.readFileSync(path.join(BENCH, 'banco-aberto-novo-102.json'), 'utf8'))
};
const REPETIR = [3, 16, 22, 104];
const itens = [];
for (const grupo of ['original', 'holdout', 'novo']) {
  const lista = bancos[grupo].slice().sort((a, b) => a.id - b.id);
  for (const it of lista) itens.push({ grupo, id: it.id, repeticao: 0, ...it });
}
for (const id of REPETIR) {
  const grupo = bancos.original.some((x) => x.id === id) ? 'original' : 'holdout';
  const it = bancos[grupo].find((x) => x.id === id);
  if (!it) throw new Error('id de repetição inexistente: ' + id);
  for (let r = 1; r <= 2; r++) itens.push({ grupo, id, repeticao: r, ...it });
}
if (itens.length !== 44) throw new Error('esperava 44 itens, veio ' + itens.length);

// A rubrica e as equivalências entram como texto no HTML — as duas, na ordem em que o Node
// carrega. Sem isso a página avaliaria com a rubrica antiga e divergiria do medidor de verdade.
const limpar = (arquivo) => fs
  .readFileSync(path.join(BENCH, arquivo), 'utf8')
  .replace(/^\/\/[^\n]*\n/gm, '')
  .replace("'use strict';", '')
  .replace(/module\.exports\s*=\s*\{[^}]*\};?/, '');
const equivalencias = limpar('equivalencias-rubrica.js');
const rubrica = equivalencias + '\n' + limpar('avaliar-aberto.js');

const MODELOS = [
  ['Qwen2.5-0.5B-Instruct-q4f16_1-MLC', '0.5B — rápido, celular fraco'],
  ['Qwen2.5-1.5B-Instruct-q4f16_1-MLC', '1.5B — padrão do chat'],
  ['Qwen3.5-0.8B-q4f16_1-MLC', 'Qwen3.5 0.8B — geração nova'],
  ['Qwen3.5-2B-q4f16_1-MLC', 'Qwen3.5 2B — equilíbrio'],
  ['Qwen2.5-3B-Instruct-q4f16_1-MLC', '3B — mais qualidade'],
  ['Qwen3.5-4B-q4f16_1-MLC', 'Qwen3.5 4B — precisa de RAM'],
  ['Phi-4-mini-instruct-q4f16_1-MLC', 'Phi-4-mini — raciocínio leve'],
  ['gemma3-1b-it-q4f16_1-MLC', 'Gemma3 1B'],
  ['Llama-3.2-3B-Instruct-q4f16_1-MLC', 'Llama 3.2 3B'],
  ['Qwen3.5-9B-q4f16_1-MLC', 'Qwen3.5 9B — pesado/aero']
];

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Medidor local — sem API, sem cota</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; font:15px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background:#0d1117; color:#e6edf3; }
  main { max-width: 900px; margin: 0 auto; padding: 20px 16px 80px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p.sub { color:#9aa7b4; margin: 0 0 16px; font-size: 13px; }
  .card { background:#161b22; border:1px solid #2b333d; border-radius:10px; padding:14px; margin:0 0 14px; }
  label { display:block; font-size:13px; color:#9aa7b4; margin-bottom:6px; }
  select, button { font:inherit; background:#21262d; color:#e6edf3; border:1px solid #3b444d; border-radius:8px; padding:9px 12px; }
  button.primario { background:#238636; border-color:#2ea043; font-weight:600; cursor:pointer; }
  button:disabled { opacity:.5; cursor:not-allowed; }
  #barra { height:8px; background:#21262d; border-radius:6px; overflow:hidden; margin:10px 0 6px; }
  #barra > i { display:block; height:100%; width:0%; background:#2ea043; transition:width .2s; }
  #estado { font-size:13px; color:#9aa7b4; min-height:20px; }
  table { width:100%; border-collapse: collapse; font-size:13px; margin-top:8px; }
  th, td { text-align:left; padding:5px 6px; border-bottom:1px solid #21262d; vertical-align:top; }
  th { color:#9aa7b4; font-weight:500; }
  .ok { color:#3fb950; } .no { color:#f85149; }
  pre { background:#0b0f14; border:1px solid #21262d; border-radius:8px; padding:10px; overflow:auto; font-size:12px; max-height:340px; }
  .aviso { border-color:#9e6a03; background:#2a2001; font-size:13px; }
  .num { font-variant-numeric: tabular-nums; }
  textarea { width:100%; min-height:90px; background:#0b0f14; color:#e6edf3; border:1px solid #21262d; border-radius:8px; padding:8px; font:13px/1.45 ui-monospace, monospace; }
</style>
</head>
<body>
<main>
  <h1>🧠 Medidor do cérebro local</h1>
  <p class="sub">Mesmas 44 perguntas e a mesma rubrica da comparação pareada de 29/10/2026 — mas sem API, sem chave e sem cota. O modelo roda no seu aparelho (WebGPU).</p>

  <div class="card aviso">
    <b>Antes de rodar:</b> precisa de Chrome ou Edge atualizado (computador ou Android) com WebGPU. O primeiro preparo baixa a biblioteca e o modelo (o tamanho depende da escolha) e fica salvo neste navegador. O cálculo da resposta não sai do aparelho; a rubrica roda aqui também.
  </div>

  <div class="card">
    <label for="modelo">Modelo local</label>
    <select id="modelo"></select>
    <label for="modo" style="margin-top:12px">Conjunto</label>
    <select id="modo">
      <option value="44">Completo — 44 respostas (mesma régua de 102)</option>
      <option value="12">Reduzido — 12 respostas (teste rápido em aparelho fraco)</option>
    </select>
    <p style="margin:12px 0 0"><button class="primario" id="rodar">▶ Rodar medição</button> <button id="parar" disabled>■ parar</button></p>
    <div id="barra"><i></i></div>
    <div id="estado">pronto.</div>
  </div>

  <div class="card" id="card-resultado" style="display:none">
    <h2 style="font-size:16px;margin:0 0 8px">Placar</h2>
    <div id="placar"></div>
    <table id="tabela"><thead><tr><th>grupo</th><th>#</th><th>r</th><th>ok</th><th>palavras</th><th>ms</th><th>falhas</th></tr></thead><tbody></tbody></table>
  </div>

  <div class="card" id="card-json" style="display:none">
    <h2 style="font-size:16px;margin:0 0 8px">JSON para colar aqui no chat</h2>
    <textarea id="json" readonly></textarea>
    <p style="margin:8px 0 0"><button id="copiar">copiar JSON</button> <span id="copiado" style="font-size:13px;color:#3fb950"></span></p>
  </div>
</main>

<script>
// ===== rubrica injetada de bench/avaliar-aberto.js (mesma função, sem alteração) =====
${rubrica}

const ITENS = ${JSON.stringify(itens)};
const MODELOS = ${JSON.stringify(MODELOS)};
const CDN = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.86/dist/web-llm.min.js';
const TETO_MS = 110000;

const $ = (id) => document.getElementById(id);
const sel = $('modelo');
MODELOS.forEach(([id, rotulo]) => { const o = document.createElement('option'); o.value = id; o.textContent = rotulo + ' — ' + id; sel.appendChild(o); });
sel.value = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';

let engine = null, parar = false;

function estado(t) { $('estado').textContent = t; }
function progresso(pct) { $('barra').firstElementChild.style.width = Math.max(0, Math.min(100, pct)) + '%'; }

function carregarScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('não consegui baixar a biblioteca WebLLM (precisa de internet na primeira vez)'));
    document.head.appendChild(s);
  });
}

async function preparar(modelo) {
  if (engine && engine.__modelo === modelo) return engine;
  if (engine) { try { await engine.unload(); } catch (e) {} engine = null; }
  estado('baixando a biblioteca do cérebro local…'); progresso(2);
  if (!window.webllm) await carregarScript(CDN);
  if (!window.webllm) throw new Error('a biblioteca WebLLM não carregou');
  if (!navigator.gpu) throw new Error('este navegador não tem WebGPU — use Chrome ou Edge atualizado');
  const e = await window.webllm.CreateMLCEngine(modelo, {
    initProgressCallback: (p) => {
      if (p && typeof p.progress === 'number') { progresso(2 + p.progress * 8); estado('baixando o modelo… ' + Math.round(p.progress * 100) + '%'); }
    }
  });
  e.__modelo = modelo;
  engine = e;
  return e;
}

// equivalências de rubrica já conhecidas (documentadas): nenhuma aplicada aqui.
// A nota abaixo é idêntica à do medidor de 102, sem afrouxar nada.
function avaliarItem(texto, it) { return avaliar(texto, it); }

async function comTeto(promessa, ms) {
  let t = null;
  const teto = new Promise((_, rej) => { t = setTimeout(() => rej(new Error('teto de ' + Math.round(ms / 1000) + 's')), ms); });
  try { return await Promise.race([promessa, teto]); } finally { clearTimeout(t); }
}

function resumo(linhas) {
  const g = {};
  for (const l of linhas) {
    const k = l.repeticao > 0 ? 'repeticoes' : l.grupo;
    g[k] = g[k] || { total: 0, ok: 0, ms: [] };
    g[k].total++; if (l.ok) g[k].ok++; g[k].ms.push(l.ms);
  }
  const med = (a) => a.length ? a.slice().sort((x, y) => x - y)[Math.floor((a.length - 1) / 2)] : 0;
  const o = {};
  for (const [k, v] of Object.entries(g)) o[k] = { total: v.total, passaram: v.ok, pct: +(100 * v.ok / v.total).toFixed(1), medianaMs: med(v.ms) };
  const tot = linhas.length, ok = linhas.filter((l) => l.ok).length;
  o.total = { total: tot, passaram: ok, pct: tot ? +(100 * ok / tot).toFixed(1) : 0, medianaMs: med(linhas.map((l) => l.ms)) };
  return o;
}

async function rodar() {
  parar = false;
  $('rodar').disabled = true; $('parar').disabled = false;
  $('card-resultado').style.display = ''; $('card-json').style.display = 'none';
  document.querySelector('#tabela tbody').innerHTML = '';
  const modelo = sel.value;
  const quantos = parseInt($('modo').value, 10);
  const lista = quantos === 44 ? ITENS.slice() : ITENS.slice(0, quantos);
  const linhas = [];
  try {
    const e = await preparar(modelo);
    if (!navigator.gpu) throw new Error('WebGPU ausente');
    estado('cérebro local pronto — começando 0/' + lista.length);
    for (let i = 0; i < lista.length; i++) {
      if (parar) break;
      const it = lista[i];
      progresso(10 + (i / lista.length) * 90);
      estado('(' + (i + 1) + '/' + lista.length + ') ' + it.grupo + ' #' + it.id + (it.repeticao ? ' r' + it.repeticao : ''));
      const t0 = performance.now();
      let texto = '', erro = null;
      try {
        const r = await comTeto(e.chat.completions.create({
          messages: [
            { role: 'system', content: 'Responda em português do Brasil, claro e correto. Siga exatamente o formato pedido (número de parágrafos, itens e limite de palavras). Não use preâmbulo.' },
            { role: 'user', content: it.q }
          ],
          temperature: 0.3,
          max_tokens: 900
        }), TETO_MS);
        texto = (((r.choices || [])[0] || {}).message || {}).content || '';
      } catch (err) { erro = String((err && err.message) || err); }
      const ms = Math.round(performance.now() - t0);
      const av = texto ? avaliarItem(texto, it) : { ok: false, falhas: ['sem texto: ' + erro], palavras: 0, paragrafos: 0, itens: 0 };
      const linha = { grupo: it.grupo, id: it.id, repeticao: it.repeticao, q: it.q, ok: av.ok, falhas: av.falhas, palavras: av.palavras, paragrafos: av.paragrafos, itens: av.itens, ms, erro, texto };
      linhas.push(linha);
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>' + it.grupo + '</td><td class="num">' + it.id + '</td><td class="num">' + (it.repeticao || '') +
        '</td><td class="' + (av.ok ? 'ok' : 'no') + '">' + (av.ok ? '✔' : '✘') + '</td><td class="num">' + av.palavras +
        '</td><td class="num">' + ms + '</td><td>' + (av.falhas.join('; ') || '—') + '</td>';
      document.querySelector('#tabela tbody').appendChild(tr);
    }
    const sum = resumo(linhas);
    $('placar').innerHTML = Object.entries(sum).map(([k, v]) =>
      '<div>' + (k === 'total' ? '<b>total</b>' : k) + ': <b>' + v.passaram + '/' + v.total + '</b> (' + v.pct + '%) · mediana ' + (v.medianaMs / 1000).toFixed(1) + ' s</div>'
    ).join('');
    const pacote = {
      meta: {
        tipo: 'medicao-local-sem-api', geradoEm: new Date().toISOString(), modelo,
        webllm: '0.2.86', navegador: navigator.userAgent,
        rubrica: 'bench/avaliar-aberto.js (injetada, sem alteração)',
        itens: '24 originais + 6 holdout + 6 novos + 8 repetições = 44 (mesma régua de 102)',
        limite: 'rubrica avalia forma e termos, não verifica se a afirmação é verdadeira'
      },
      sum, res: linhas
    };
    $('json').value = JSON.stringify(pacote);
    $('card-json').style.display = '';
    estado('terminou: ' + sum.total.passaram + '/' + sum.total.total + ' — copie o JSON e mande no chat.');
    progresso(100);
  } catch (err) {
    estado('erro: ' + String((err && err.message) || err));
  } finally {
    $('rodar').disabled = false; $('parar').disabled = true;
  }
}

$('rodar').addEventListener('click', rodar);
$('parar').addEventListener('click', () => { parar = true; estado('parando depois do item atual…'); });
$('copiar').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('json').value); $('copiado').textContent = 'copiado ✓'; }
  catch (e) { $('json').select(); $('copiado').textContent = 'selecione e copie (Ctrl+C)'; }
});

if (!navigator.gpu) {
  estado('⚠️ este navegador não expõe WebGPU — abra no Chrome/Edge atualizado (computador ou Android). O cérebro local não roda aqui.');
  $('rodar').disabled = true;
}
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(BENCH, 'local-sem-api.html'), html);
console.log('gerado bench/local-sem-api.html com ' + itens.length + ' itens (' + Buffer.byteLength(html) + ' bytes)');
