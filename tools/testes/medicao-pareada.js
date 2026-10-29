// Offline: o plano pareado, contrabalanceamento e réguas não fabricam placar de prefixo.
'use strict';
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { construirAgenda, resumo } = require('../../bench/medir-pareado-102');
const { avaliar } = require('../../bench/avaliar-aberto');
const raiz = path.resolve(__dirname,'../..');
const banco = nome=>require('../../bench/'+nome+'.json');
const original=banco('banco-aberto-antes-100'), holdout=banco('banco-aberto-holdout-100'), novo=banco('banco-aberto-novo-102');
const agenda=construirAgenda({original,holdout,novo});
assert.deepEqual(agenda,construirAgenda({original,holdout,novo}));
assert.equal(agenda.length,88);
for(const [grupo,b] of Object.entries({original,holdout,novo})) {
  const p=agenda.filter(x=>x.grupo===grupo&&x.repeticao===0);
  assert.equal(p.length,b.length*2);
  assert.equal(p.filter((x,i)=>i%2===0&&x.versao==='A').length,b.length/2);
  for(let i=0;i<p.length;i+=2) { assert.equal(p[i].id,p[i+1].id); assert.notEqual(p[i].versao,p[i+1].versao); }
}
const rep=agenda.filter(x=>x.repeticao>0);assert.equal(rep.length,16);
for(const id of [3,16,22,104]) for(const r of [1,2]) assert.equal(rep.filter(x=>x.id===id&&x.repeticao===r).length,2);
const parcial=agenda.slice(0,3).map(x=>({...x,ok:true,ms:10}));
for(const g of Object.values(resumo(parcial,agenda))) for(const versao of Object.values(g)) if(!versao.completo) assert.equal(versao.pct,null);
const completo=agenda.map((x,i)=>({...x,ok:i%2===0,ms:i+1}));
const sum=resumo(completo,agenda);assert(sum.original.A.completo&&sum.original.B.completo);
function sha(p){return crypto.createHash('sha256').update(fs.readFileSync(path.join(raiz,p))).digest('hex');}
assert.equal(sha('bench/banco-aberto-antes-100.json'),'f00a1ed677974487bc70024ddb4e083e3fd11fe41e139c5a1270f7c6d68558e2');
assert.equal(sha('bench/controle-101-roteador.js'),'5ff3587204e2b1394bcbb7f64b4705cc605a83bdf59c4b159e419192f4f48e27');
assert.equal(sha('bench/avaliar-aberto.js'),'84994993f185630095ffb3f5111f0ad49837a6f29565da75df55f1f767579f90');
// As equivalências mudam a nota: o arquivo também fica preso ao hash para não mudar em silêncio.
assert.equal(sha('bench/equivalencias-rubrica.js'),'ec65bd1c0dd7ab21b5f914d50b345105ec8c2e4d15bb053d2d23fef96a8f5ab3');
for(const it of novo) {
  assert.equal(avaliar('',it).ok,false,'vazio não pode passar');
  const t='Uma resposta sem os conceitos específicos. '.repeat(20)+'\n\n'+ 'Outra parte sem os conceitos específicos. '.repeat(20);
  assert.equal(avaliar(t,it).ok,false,'texto irrelevante não pode passar');
}
console.log('✔ agenda 88 respostas, A/B pareado e balanceado; repetições, rubricas originais e ausência de percentual parcial');
