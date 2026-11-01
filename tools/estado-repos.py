#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Estado dos repositórios da casa — e o conserto do jeito errado de trabalhar.

POR QUE EXISTE (26/10/2026): duas vezes nesta semana o clone local apareceu num commit
antigo, o commit foi feito por cima dele e o push foi recusado. Causa real: `.git/config`
NÃO sobrevive ao snapshot do workspace (é caminho sensível, excluído de propósito), então
a identidade some entre sessões — e, sem buscar o remoto antes, o clone silenciosamente
envelhece enquanto o runner continua commitando memória.

O que este script faz, por repositório:
  1. define a identidade de commit (por comando, sem depender de .git/config);
  2. busca o remoto e compara local com remoto, dizendo se está atrás, à frente ou igual;
  3. com --sincronizar, faz `reset --hard` no remoto — só quando não há trabalho local
     pendente, e avisando quando houver (não destrói nada calado).

Uso:
    python3 tools/estado-repos.py                  # só relata
    python3 tools/estado-repos.py --sincronizar    # alinha os limpos no remoto
"""
import json
import os
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Mapa explícito diretório → repositório. NÃO derivar do .git/config: ele é excluído do
# snapshot do workspace e volta SEM a seção [remote] — foi assim que o clone ficou sem
# destino e o push foi recusado. Nome de repositório é dado, não descoberta.
REPOS = {
    "motor-work": "motor",
    "agente-work": "agente",
    "base-work": "base",
    "site-work": "site",
    "chat-work": "chat",
}
IDENTIDADE = ["-c", "user.name=Rebocl Agent", "-c", "user.email=agent@users.noreply.github.com"]


def token():
    for caminho in (os.path.join(RAIZ, "tools", ".token-github"),
                    os.path.expanduser("~/tools/.token-github")):
        if os.path.exists(caminho):
            with open(caminho, encoding="utf-8") as f:
                return f.read().strip()
    return ""


def git(repo, *args, url=None, timeout=120):
    """Roda git e devolve (código, saída). Nunca deixa a URL com token vazar na saída."""
    if url is not None and not isinstance(url, str):
        return 1, "sem URL utilizável"
    cmd = ["git", "-C", repo] + IDENTIDADE + [str(a) for a in args]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    saida = (r.stdout or "") + (r.stderr or "")
    if url:
        saida = saida.replace(url, "***")
    return r.returncode, saida


def ler_config_nome(arquivo):
    """Nome do repositório no GitHub saído do próprio .git/config (sem expor credencial)."""
    caminho = os.path.join(arquivo, ".git", "config")
    try:
        with open(caminho, encoding="utf-8") as f:
            for linha in f:
                if "url = " in linha and "github.com" in linha:
                    url = linha.split("url = ", 1)[1].strip()
                    if url.endswith(".git"):
                        url = url[:-4]
                    return url.rsplit("/", 1)[-1]
                    break
    except OSError:
        return None
    return None


def url_com_token(registro, tok, repo_dir=None):
    """URL de acesso pelo mapa fixo (o .git/config não é confiável no snapshot)."""
    nome = REPOS.get(registro) or (ler_config_nome(repo_dir) if repo_dir else None)
    if not nome or not tok:
        return None
    return "https://x-access-token:%s@github.com/reboclbrank-max/%s.git" % (tok, nome)


def estado(registro, tok, sincronizar=False):
    repo = os.path.join(RAIZ, registro)
    out = {"repositorio": registro, "existe": os.path.isdir(os.path.join(repo, ".git")),
           "nome": REPOS.get(registro)}
    if not out["existe"]:
        return out
    # garante a identidade mesmo quando o snapshot devolve um .git/config vazio
    git(repo, "config", "user.name", "Rebocl Agent")
    git(repo, "config", "user.email", "agent@users.noreply.github.com")
    rc, sujo = git(repo, "status", "--porcelain")
    out["pendencias_locais"] = len([l for l in (sujo or "").splitlines() if l.strip()])
    url = url_com_token(registro, tok, repo)
    if url:
        git(repo, "fetch", "-q", "--force", url, "main", timeout=180)
        rc, remoto = git(repo, "rev-parse", "FETCH_HEAD")
        out["remoto"] = (remoto or "").strip()[:7]
    rc, local = git(repo, "rev-parse", "HEAD")
    out["local"] = (local or "").strip()[:7]
    rc, atras = git(repo, "rev-list", "--count", "HEAD..FETCH_HEAD")
    rc2, frente = git(repo, "rev-list", "--count", "FETCH_HEAD..HEAD")
    out["atras"] = int((atras or "0").strip() or 0)
    out["a_frente"] = int((frente or "0").strip() or 0)
    if sincronizar:
        if out["pendencias_locais"] == 0 and out["atras"] > 0 and out["a_frente"] == 0:
            rc, msg = git(repo, "reset", "-q", "--hard", "FETCH_HEAD")
            out["acao"] = "alinhado no remoto" if rc == 0 else "falha ao alinhar: " + msg[:80]
            out["local"] = out["remoto"]
            out["atras"] = 0
        elif out["pendencias_locais"]:
            out["acao"] = "NÃO alinhado: há trabalho local não commitado (nada foi apagado)"
        elif out["a_frente"]:
            out["acao"] = "NÃO alinhado: há commit local à frente (rebase necessário)"
        else:
            out["acao"] = "já estava no remoto"
    return out


def main(argv):
    sincronizar = "--sincronizar" in argv
    tok = token()
    if not tok:
        print("sem token do GitHub em tools/.token-github — só dá para relatar o local")
    resultados = [estado(r, tok, sincronizar) for r in REPOS]
    for r in resultados:
        if not r.get("existe"):
            print("  %-12s (sem clone neste workspace)" % r["repositorio"])
            continue
        sinal = ("=" if not r.get("atras") and not r.get("a_frente")
                 else ("ATRÁS %d" % r["atras"] if r.get("atras") else "À FRENTE %d" % r["a_frente"]))
        print("  %-12s %-9s local %s · remoto %s · sujos %d%s" % (
            r["repositorio"], sinal, r.get("local"), r.get("remoto"),
            r.get("pendencias_locais", 0),
            ("  → " + r["acao"]) if r.get("acao") else ""))
    if "--json" in argv:
        print(json.dumps(resultados, ensure_ascii=False, indent=1))
    pendente = [r for r in resultados if r.get("atras")]
    if pendente and not sincronizar:
        print("\n✗ %d repositório(s) atrás do remoto. Commit em cima disso é o defeito que já "
              "custou dois pushes recusados." % len(pendente))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
