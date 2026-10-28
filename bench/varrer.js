const fs=require('fs');
const dna=JSON.parse(fs.readFileSync(__dirname+'/../dna.json','utf8'));
const alvos=dna.motores;
async function um(m){
  const url=m.base.replace(/\/$/,'')+'/chat/completions';
  const t=Date.now();
  try{
    const c=new AbortController(); const to=setTimeout(()=>c.abort(),45000);
    const r=await fetch(url,{method:'POST',signal:c.signal,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:m.modelo,messages:[{role:'user',content:'Responda só: ok'}],max_tokens:16,temperature:0})});
    clearTimeout(to);
    const txt=await r.text();
    let tipo='?';try{const j=JSON.parse(txt);tipo=j.choices?.[0]?.message?'ok':(j.error?'erro-json':'vazio')}catch{tipo='nao-json'}
    return {id:m.id,nome:m.nome,status:r.status,tipo,ms:Date.now()-t,amostra:txt.slice(0,80).replace(/\s+/g,' ')};
  }catch(e){ return {id:m.id,nome:m.nome,status:0,tipo:e.name==='AbortError'?'timeout':'rede',ms:Date.now()-t,amostra:String(e.message).slice(0,60)}; }
}
(async()=>{
  const out=[]; const fila=[...alvos];
  const workers=Array.from({length:6},async()=>{while(fila.length){const m=fila.shift();out.push(await um(m));}});
  await Promise.all(workers);
  out.sort((a,b)=>(a.status||999)-(b.status||999));
  fs.writeFileSync(__dirname+'/varredura.json',JSON.stringify(out,null,1));
  for(const o of out) console.log(String(o.status).padStart(4),String(o.ms+'ms').padStart(8),o.id.padEnd(12),(o.tipo||'').padEnd(10),(o.amostra||'').slice(0,50));
  const vivos=out.filter(o=>o.status===200&&o.tipo==='ok');
  console.log(`\nVIVAS ${vivos.length}/${out.length} = ${(100*vivos.length/out.length).toFixed(0)}%`);
})();
