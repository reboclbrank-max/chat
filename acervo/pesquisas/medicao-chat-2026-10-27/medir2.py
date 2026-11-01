import json, re, time, urllib.request, concurrent.futures as cf

ROTAS = {
 "g4f/Nemotron-Ultra-550B":  ("https://nvidia.g4f.dev/v1/chat/completions","nvidia/nemotron-3-ultra-550b-a55b"),
 "OVH/gpt-oss-120b":         ("https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions","gpt-oss-120b"),
 "OVH/Qwen3.5-397B":         ("https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions","Qwen3.5-397B-A17B"),
 "pollinations/openai-fast": ("https://text.pollinations.ai/openai","openai-fast"),
}
TODAS = json.load(open('/home/user/chat-work/banco-questoes.json'))["questoes"]
# 15 itens: todos os 10 de matemática + 5 de sequência/linguagem, na ordem do banco
SEL = TODAS[:15]
SYS = "Responda em uma linha, apenas o resultado numérico ou a palavra pedida. Sem explicação."

def call(url, model, pergunta, to=90):
    body = json.dumps({"model": model, "temperature": 0, "max_tokens": 500,
        "messages":[{"role":"system","content":SYS},{"role":"user","content":pergunta}]}).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type":"application/json","Accept":"application/json"})
    t=time.time()
    with urllib.request.urlopen(req, timeout=to) as r:
        d=json.loads(r.read().decode("utf-8","replace"))
    return time.time()-t, d["choices"][0]["message"]

def acertou(resp, gab):
    r = resp.lower().strip()
    nums=[n.replace('.',',') for n in re.findall(r"-?\d+(?:[.,]\d+)?", r)][-3:]
    for g in gab:
        gn=g.lower().replace('.',',')
        if re.fullmatch(r"-?\d+(?:,\d+)?", gn):
            if gn in nums: return True
        elif gn in r: return True
    return False

def medir(nome):
    url, model = ROTAS[nome]; out=[]
    for it in SEL:
        rec={"rota":nome,"id":it["id"],"q":it["q"],"gabarito":it["g"],"resposta":"","segundos":None,"ok":False,"erro":None}
        for tent in range(4):
            try:
                dt,m = call(url, model, it["q"])
                c=(m.get("content") or "").strip(); reas=(m.get("reasoning") or "")
                rec.update(resposta=c[:160], segundos=round(dt,2), ok=acertou(c or reas, it["g"]), erro=None)
                break
            except Exception as e:
                code=getattr(e,'code',None)
                rec["erro"]=f"{type(e).__name__}:{code if code else str(e)[:40]}"
                time.sleep(4*(tent+1))
        out.append(rec); time.sleep(2)
    return out

res=[]
with cf.ThreadPoolExecutor(4) as ex:
    for lote in ex.map(medir, list(ROTAS)):
        res += lote
json.dump(res, open('/home/user/pesquisas/medicao-chat-2026-10-27/resultados2.json','w'), ensure_ascii=False, indent=1)

import collections
print(f"{'rota':26s} {'ok':>7s} {'falhou':>7s} {'lat med':>8s}")
for n in ROTAS:
    sub=[r for r in res if r["rota"]==n]
    ok=sum(r["ok"] for r in sub); err=sum(1 for r in sub if r["erro"])
    lat=sorted(r["segundos"] for r in sub if r["segundos"]); med=lat[len(lat)//2] if lat else 0
    print(f"{n:26s} {ok:>3d}/{len(sub):<3d} {err:>7d} {med:>7.2f}s")
