// Comparação pareada, gratuita e retomável: 101 vs candidato 102.
// Mesma pergunta, mesmo avaliador e bancos preservados; ordem contrabalanceada por hash.
// Uma única janela não elimina variação dos provedores nem isola os efeitos do pacote.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { avaliar } = require('./avaliar-aberto');
const raiz = path.resolve(__dirname, '..');
const arquivos = {
  controle: path.join(__dirname, 'controle-101-roteador.js'),
  candidato: path.join(raiz, 'roteador-ia.js'),
  fontes: path.join(raiz, 'fontes-publicas.json'),
  original: path.join(__dirname, 'banco-aberto-antes-100.json'),
  holdout: path.join(__dirname, 'banco-aberto-holdout-100.json'),
  novo: path.join(__dirname, 'banco-aberto-novo-102.json'),
  rubrica: path.join(__dirname, 'avaliar-aberto.js'),
  medidor: __filename
};
const SEED = 'comparacao-102-20261029';
const REPETIR = [3, 16, 22, 104];
function sha(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function ordem(valor) { return crypto.createHash('sha256').update(SEED + ':' + valor).digest('hex'); }
function construirAgenda(bancos) {
  let pares = [];
  for (const grupo of ['original','holdout','novo']) {
    const itens = bancos[grupo].slice().sort((a,b)=>ordem(grupo+':ordem:'+a.id).localeCompare(ordem(grupo+':ordem:'+b.id)));
    itens.forEach((it,i)=>pares.push({ grupo, id:it.id, repeticao:0, primeiro:i<itens.length/2?'A':'B' }));
  }
  // Outra semente de ordenação evita colocar todas as primeiras versões juntas.
  pares.sort((a,b)=>ordem('agenda:'+a.grupo+':'+a.id).localeCompare(ordem('agenda:'+b.grupo+':'+b.id)));
  const repetidos = [];
  for (const id of REPETIR) for (let repeticao=1; repeticao<=2; repeticao++) {
    const grupo = bancos.original.some(x=>x.id===id) ? 'original' : 'holdout';
    repetidos.push({ grupo, id, repeticao, primeiro: ((id + repeticao) % 2) ? 'A' : 'B' });
  }
  repetidos.sort((a,b)=>ordem('repeticao:'+a.id+':'+a.repeticao).localeCompare(ordem('repeticao:'+b.id+':'+b.repeticao)));
  pares = pares.concat(repetidos);
  return pares.flatMap(p=>[p.primeiro, p.primeiro==='A'?'B':'A'].map(versao=>({...p,versao})));
}
function resumo(res, agenda) {
  const out={};
  for (const grupo of ['original','holdout','novo','repeticoes']) {
    out[grupo]={};
    for (const versao of ['A','B']) {
      const esperado=agenda.filter(x=>x.versao===versao&&(grupo==='repeticoes'?x.repeticao>0:x.grupo===grupo&&x.repeticao===0)).length;
      const linhas=res.filter(x=>x.versao===versao&&(grupo==='repeticoes'?x.repeticao>0:x.grupo===grupo&&x.repeticao===0));
      const certos=linhas.filter(x=>x.ok).length;
      const ms=linhas.map(x=>x.ms).sort((a,b)=>a-b), meio=Math.floor(ms.length/2);
      out[grupo][versao]={ total:linhas.length, previsto:esperado, completo:linhas.length===esperado,
        passaram:certos, pct:linhas.length===esperado?Math.round(1000*certos/esperado)/10:null,
        medianaMs:!ms.length?null:ms.length%2?ms[meio]:(ms[meio-1]+ms[meio])/2 };
    }
  }
  return out;
}
function salvar(nome, obj) { const tmp=nome+'.tmp'; fs.writeFileSync(tmp, JSON.stringify(obj,null,2)+'\n'); fs.renameSync(tmp,nome); }
async function main() {
  const saida=path.resolve(__dirname,process.env.SAIDA_PAREADO||'resultado-pareado-102.json');
  const bancos=Object.fromEntries(['original','holdout','novo'].map(k=>[k,JSON.parse(fs.readFileSync(arquivos[k],'utf8'))]));
  for (const [nome,b] of Object.entries(bancos)) if(!Array.isArray(b)||!b.length||new Set(b.map(x=>x.id)).size!==b.length) throw new Error('Banco inválido: '+nome);
  const agenda=construirAgenda(bancos);
  const hashes=Object.fromEntries(Object.entries(arquivos).map(([k,v])=>[k,sha(v)]));
  const chave=x=>[x.grupo,x.id,x.repeticao,x.versao].join(':');
  let res=[], meta={ iniciado:new Date().toISOString(), terminado:null, seed:SEED, hashes, versoes:{A:'controle 101',B:'candidato 102'},
    ordem:'pareada e contrabalanceada por grupo; sequencial; duas repetições adicionais para IDs conhecidos', node:process.version,
    cache:'desligado para obter geração nova; saúde e cooldown compartilhado entre versões', retomadas:0, janelas:[] };
  if(fs.existsSync(saida)) {
    if(process.env.RETOMAR_PAREADO!=='1') throw new Error('Saída já existe; escolha outro arquivo ou retome com RETOMAR_PAREADO=1');
    const velho=JSON.parse(fs.readFileSync(saida,'utf8'));
    if(!velho.meta || JSON.stringify(velho.meta.hashes)!==JSON.stringify(hashes) || velho.meta.seed!==SEED || JSON.stringify(velho.agenda)!==JSON.stringify(agenda)) throw new Error('Hashes, plano ou ordem mudaram; retomada recusada.');
    if(velho.invalido || velho.completo) throw new Error('Execução inválida ou concluída não pode ser retomada.');
    res=velho.res || []; meta={...velho.meta,retomadas:(velho.meta.retomadas||0)+1,terminado:null};
    const chaves=new Set(agenda.map(chave)); if(new Set(res.map(chave)).size!==res.length||res.some(x=>!chaves.has(chave(x)))) throw new Error('Checkpoint inconsistente.');
  }
  meta.janelas.push({iniciado:new Date().toISOString(),terminado:null});
  function registrar(final) {
    const invalido=Object.entries(arquivos).some(([k,v])=>sha(v)!==hashes[k]);
    if(final) { meta.terminado=new Date().toISOString(); meta.janelas[meta.janelas.length-1].terminado=meta.terminado; }
    salvar(saida,{meta, agenda, res, sum:resumo(res,agenda), completo:!invalido&&res.length===agenda.length, invalido});
    if(invalido) throw new Error('Um dos arquivos mudou durante a medição; resultado inválido.');
  }
  registrar(false);
  for(const sig of ['SIGTERM','SIGINT']) process.once(sig,()=>{ try { registrar(true); console.error('Interrompido; checkpoint parcial preservado.'); } finally { process.exit(sig==='SIGINT'?130:143); } });
  const A=require(arquivos.controle).Roteador, B=require(arquivos.candidato).Roteador;
  const roteadores={A:new A(),B:new B()}, cooldown={}, proximas={};
  let trilha=null;
  for(const r of Object.values(roteadores)) {
    r.cooldownsRate=cooldown; r.proximaChamada=proximas;
    r._cacheGet=()=>null; r._cacheSet=()=>{};
    const original=r._chamar.bind(r);
    r._chamar=async function(rota,q,timeout,op) {
      const inicio=new Date().toISOString(), t=Date.now(); let resposta;
      try { resposta=await original(rota,q,timeout,op); return resposta; }
      finally { if(trilha) trilha.push({rota:rota.id,inicio,ms:Date.now()-t,resultado:resposta&&resposta.erro||(resposta&&resposta.texto?'texto':'excecao'),retryAfterSegundos:resposta&&resposta.espera!=null?resposta.espera:null,fim:resposta&&resposta.bruto||null}); }
    };
  }
  const medidos=new Set(res.map(chave));
  for(const passo of agenda) {
    if(medidos.has(chave(passo))) continue;
    const it=bancos[passo.grupo].find(x=>x.id===passo.id);
    const t0=Date.now(); trilha=[]; let o;
    try { o=await roteadores[passo.versao].responder({pergunta:it.q,tipo:'aberto'}); }
    catch(e) { o={texto:null,erro:String(e&&e.message||e).slice(0,200)}; }
    const av=avaliar(o&&o.texto,it);
    const linha={...passo,q:it.q,ok:av.ok,falhas:av.falhas,palavras:av.palavras,paragrafos:av.paragrafos,itens:av.itens,
      ms:Date.now()-t0,rota:o&&o.rota||null,erro:o&&o.erro||null,incompleto:!!(o&&o.incompleto),
      avisoFormato:o&&o.avisoFormato||null,verificacaoFactual:o&&o.verificacaoFactual||null,
      fontesConsultadas:o&&o.fontesConsultadas||[],chamadas:trilha,texto:String(o&&o.texto||'')};
    trilha=null; res.push(linha); medidos.add(chave(passo)); registrar(false);
    console.log((linha.ok?'✔':'✘')+' '+passo.grupo+' #'+passo.id+' r'+passo.repeticao+' '+passo.versao+
      ' '+linha.palavras+'p '+linha.ms+'ms '+(linha.ok?'':linha.falhas.join(' · '))+' ['+res.length+'/'+agenda.length+']');
  }
  registrar(true); console.log('\n'+JSON.stringify(resumo(res,agenda),null,2)); console.log('Arquivo: '+saida);
}
if(require.main===module) main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={construirAgenda,resumo};
