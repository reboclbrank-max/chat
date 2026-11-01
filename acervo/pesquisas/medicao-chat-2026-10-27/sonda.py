import json, time, urllib.request, concurrent.futures as cf

ROTAS = [
 ("g4f/GLM-5.3","https://nvidia.g4f.dev/v1/chat/completions","z-ai/glm-5.3",None),
 ("g4f/Nemotron-Ultra-550B","https://nvidia.g4f.dev/v1/chat/completions","nvidia/nemotron-3-ultra-550b-a55b",None),
 ("g4f/Kimi-K3","https://nvidia.g4f.dev/v1/chat/completions","moonshotai/kimi-k3",None),
 ("OVH/Qwen3.5-397B","https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions","Qwen3.5-397B-A17B",None),
 ("OVH/Qwen3.8-27B","https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions","Qwen3.8-27B",None),
 ("OVH/gpt-oss-120b","https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions","gpt-oss-120b",None),
 ("pollinations/openai-fast","https://text.pollinations.ai/openai","openai-fast",None),
 ("llm7/gpt-6-astra","https://api.llm7.io/v1/chat/completions","gpt-6-astra",None),
 ("llm7/claude-opus-5-5","https://api.llm7.io/v1/chat/completions","claude-opus-5-5",None),
 ("llm7/gemini-4-argon","https://api.llm7.io/v1/chat/completions","gemini-4-argon",None),
 ("llm7/kimi-k3","https://api.llm7.io/v1/chat/completions","kimi-k3",None),
 ("llm7/DeepSeek-V4.1-Flash","https://api.llm7.io/v1/chat/completions","DeepSeek-V4.1-Flash",None),
]

def call(url,model,msgs,maxtok=120,to=120):
    body=json.dumps({"model":model,"messages":msgs,"temperature":0,"max_tokens":maxtok}).encode()
    req=urllib.request.Request(url,data=body,headers={"Content-Type":"application/json","Accept":"application/json"})
    t=time.time()
    with urllib.request.urlopen(req,timeout=to) as r:
        raw=r.read().decode("utf-8","replace")
    dt=time.time()-t
    try:
        d=json.loads(raw); ch=d["choices"][0]["message"]
        txt=(ch.get("content") or "").strip()
        return dt,txt,None
    except Exception as e:
        return dt,"",f"parse:{raw[:120]}"

def sonda(item):
    nome,url,model,_=item
    try:
        dt,txt,err=call(url,model,[{"role":"user","content":"Responda apenas com o número: 17+26"}],60)
        return (nome,round(dt,2),(txt or err or "vazio")[:80])
    except Exception as e:
        return (nome,None,f"ERRO {type(e).__name__}: {str(e)[:80]}")

with cf.ThreadPoolExecutor(len(ROTAS)) as ex:
    for nome,dt,txt in ex.map(sonda,ROTAS):
        print(f"{nome:26s} {str(dt):>7s}  {txt}")
