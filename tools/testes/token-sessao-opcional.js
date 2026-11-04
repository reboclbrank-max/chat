'use strict';
// Simula o token local sem rede, PAT real ou efeito externo.
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'../..');
function store(initial={}){const m=new Map(Object.entries(initial));return {
 getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)
};}
let n=0;
for(const page of ['index.html','direto.html','ligar.html','limpar.html']){
 const source=fs.readFileSync(path.join(root,page),'utf8');
 const from=source.indexOf("const CHAVE_TOKEN = 'assistente_rebocl_token';");
 const to=source.indexOf("let conversa = null, intervalo",from);
 assert(from>=0&&to>from,page+' sem fluxo do token');
 assert.match(source,/id="token-sessao"/);
 const local=store(),sessao=store({assistente_rebocl_token:'TOKEN-SOMENTE-TESTE'});
 const context={localStorage:local,sessionStorage:sessao};vm.createContext(context);
 vm.runInContext(source.slice(from,to)+"\nglobalThis.prova={ler:()=>token,sessao:guardarTokenSomenteSessao,persistente:guardarTokenPersistente};",context);
 assert.equal(context.prova.ler(),'TOKEN-SOMENTE-TESTE');
 assert.equal(local.getItem('assistente_rebocl_token'),null);
 context.prova.persistente('TOKEN-PERSISTENTE');
 assert.equal(local.getItem('assistente_rebocl_token'),'TOKEN-PERSISTENTE');
 context.prova.sessao('TOKEN-SESSAO');
 assert.equal(local.getItem('assistente_rebocl_token'),null);
 assert.equal(sessao.getItem('assistente_rebocl_token'),'TOKEN-SESSAO');
 context.prova.sessao('');
 assert.equal(local.getItem('assistente_rebocl_token'),null);
 assert.equal(sessao.getItem('assistente_rebocl_token'),null);
 n++;
}
const c=fs.readFileSync(path.join(root,'console.html'),'utf8');
assert.doesNotMatch(c,/if \(token && !localStorage\.getItem\(CHAVE_TOKEN\)\)/);
assert.match(c,/sessionStorage\.getItem\(CHAVE_TOKEN\)/);
console.log(n+'/4 rotas aprovadas para token temporário sem promoção');
