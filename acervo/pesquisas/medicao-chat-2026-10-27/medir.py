import json, re, time, urllib.request, concurrent.futures as cf

ROTAS = {
 "g4f/Nemotron-Ultra-550B":  ("https://nvidia.g4f.dev/v1/chat/completions","nvidia/nemotron-3-ultra-550b-a55b"),
 "g4f/GLM-5.3":              ("https://nvidia.g4f.dev/v1/chat/completions","z-ai/glm-5.3"),
 "OVH/gpt-oss-120b":         ("https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions","gpt-oss-120b"),
 "OVH/Qwen3.5-397B":         ("https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions","Qwen3.5-397B-A17B"),
 "pollinations/openai-fast": ("https://text.pollinations.ai/openai","openai-fast"),
 "llm7/glm-5.3":             ("https://api.llm7.io/v1/chat/completions","glm-5.3"),
 "llm7/kimi-k3":             ("https://api.llm7.io/v1/chat/completions","kimi-k3"),
}

q = json.load(open('/home/user/chat-work/banco-questoes.json'))["questoes"]
SYS = "Responda em uma linha, apenas o resultado numérico ou a palavra pedida. Sem explicação."

def call(url, model, pergunta, to=100):
    body = json.dumps({"model": model, "temperature": 0, "max_tokens": 600,
        "messages":[{"role":"system","content":SYS},{"role":"user","content":pergunta}]}).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type":"application/json","Accept":"application/json"})
    t=time.time()
    with urllib.request.urlopen(req, timeout=to) as r:
        d=json.loads(r.read().decode("utf-8","replace"))
    dt=time.time()-t
    m=d["choices"][0]["message"]
    return dt, (m.get("content") or "").strip(), (m.get("reasoning") or "")

def norm(s):
    return re.sub(r"\s+"," ", s).lower().strip()

def acertou(resp, gabaritos):
    # pega o último número/palavra da resposta curta
    r = norm(resp)
    if not r: return False
    toks = re.findall(r"-?\d+(?:[.,]\d+)?", r)
    alvo = [norm(g) for g in gabaritos]
    cand = []
    if toks: cand = toks[-3:]
    candnorm = [c.replace('.',',') for c in cand]
    for g in alvo:
        gn = g.replace('.',',')
        if re.fullmatch(r"-?\d+(?:,\d+)?", gn):
            if gn in candnorm: return True
        else:
            if g in r: return True
    return False

def tarefa(args):
    nome, item = args
    url, model = ROTAS[nome]
    ultimo = None
    for tent in (1,2):
        try:
            dt, c, reas = call(url, model, item["q"])
            ok = acertou(c if c else reas, item["g"])
            return {"rota":nome,"id":item["id"],"q":item["q"],"gabarito":item["g"],
                    "resposta":c[:200],"reasoning_len":len(reas),"segundos":round(dt,2),
                    "ok":ok,"erro":None,"tentativa":tent}
        except Exception as e:
            ultimo = f"{type(e).__name__}: {str(e)[:120]}"
    return {"rota":nome,"id":item["id"],"q":item["q"],"gabarito":item["g"],
            "resposta":"","reasoning_len":0,"segundos":None,"ok":False,"erro":ultimo,"tentativa":2}

jobs=[(n,it) for n in ROTAS for it in q]
res=[]
t0=time.time()
with cf.ThreadPoolExecutor(8) as ex:
    for r in ex.map(tarefa, jobs):
        res.append(r)
json.dump(res, open('/home/user/pesquisas/medicao-chat-2026-10-27/resultados.json','w'), ensure_ascii=False, indent=1)

import collections
tab=collections.defaultdict(lambda: {"ok":0,"n":0,"err":0,"lat":[]})
for r in res:
    d=tab[r["rota"]]; d["n"]+=1
    if r["erro"]: d["err"]+=1
    else:
        d["ok"]+= r["ok"]; d["lat"].append(r["segundos"])
print(f"{'rota':26s} {'acertos':>9s} {'erros':>6s} {'lat med':>8s}")
for n,d in tab.items():
    lat=sorted(d["lat"]); med=lat[len(lat)//2] if lat else 0
    print(f"{n:26s} {d['ok']:>4d}/{d['n']:<4d} {d['err']:>6d} {med:>7.2f}s")
print("tempo total %.0fs"%(time.time()-t0))
