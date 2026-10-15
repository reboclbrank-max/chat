#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 👁️‍🗨️ VISÃO LOCAL DA CASA v1.3 (15/10/2026) — descreve a foto com um modelo de visão que roda AQUI MESMO
# (llama.cpp na CPU do runner). Nada de serviço de terceiros: quando os motores de visão da internet caem
# (504/502, como na madrugada de 15/10), a casa ainda VÊ a foto.
# Uso:
#   python3 tools/visao-local.py --preparar              → baixa binário + modelo (para o turno rodar em 2º plano)
#   python3 tools/visao-local.py foto.png [--pergunta "..."] [--modelo chave]   → JSON na stdout
import fcntl
import json
import os
import platform
import shutil
import subprocess
import sys
import tarfile
import time
import urllib.request

BUILD = 'b11635'   # llama.cpp fixado (reprodutível); binário CPU Ubuntu x64, ~18 MB
BIN_URL = ('https://github.com/ggml-org/llama.cpp/releases/download/%s/llama-%s-bin-ubuntu-x64.tar.gz' % (BUILD, BUILD))
HF = 'https://huggingface.co/%s/resolve/main/%s'
MODELOS = {
    # chave: (repositório, modelo, projetor de imagem)
    'qwen3vl-2b': ('ggml-org/Qwen3-VL-2B-Instruct-GGUF', 'Qwen3-VL-2B-Instruct-Q8_0.gguf', 'mmproj-Qwen3-VL-2B-Instruct-Q8_0.gguf'),
    'internvl3-2b': ('ggml-org/InternVL3-2B-Instruct-GGUF', 'InternVL3-2B-Instruct-Q4_K_M.gguf', 'mmproj-InternVL3-2B-Instruct-Q8_0.gguf'),
    'gemma4-e2b': ('ggml-org/gemma-4-E2B-it-GGUF', 'gemma-4-E2B-it-Q4_0.gguf', 'mmproj-gemma-4-E2B-it-Q8_0.gguf'),
    'gemma3-4b': ('ggml-org/gemma-3-4b-it-GGUF', 'gemma-3-4b-it-Q4_K_M.gguf', 'mmproj-model-f16.gguf'),
    'smol-500m': ('ggml-org/SmolVLM-500M-Instruct-GGUF', 'SmolVLM-500M-Instruct-Q8_0.gguf', 'mmproj-SmolVLM-500M-Instruct-Q8_0.gguf'),
}
PADRAO = os.environ.get('VISAO_MODELO', 'qwen3vl-2b')
CACHE = os.environ.get('VISAO_CACHE', os.path.expanduser('~/.cache/visao-casa'))


def responde(d):
    print(json.dumps(d, ensure_ascii=False))
    sys.exit(0)


def baixa(url, destino):
    """Baixa para .part e renomeia no fim — download interrompido nunca vira arquivo 'pronto'."""
    if os.path.exists(destino) and os.path.getsize(destino) > 0:
        return
    parte = destino + '.part'
    rq = urllib.request.Request(url, headers={'User-Agent': 'casa-rebocl/visao-local'})
    with urllib.request.urlopen(rq, timeout=120) as r, open(parte, 'wb') as f:
        shutil.copyfileobj(r, f, 4 * 1024 * 1024)
    os.replace(parte, destino)


def prepara(chave):
    if chave not in MODELOS:
        raise RuntimeError('modelo desconhecido: ' + chave)
    if platform.system() != 'Linux' or platform.machine() not in ('x86_64', 'AMD64'):
        raise RuntimeError('a visão local só roda em Linux x64 (aqui: %s %s)' % (platform.system(), platform.machine()))
    os.makedirs(CACHE, exist_ok=True)
    with open(os.path.join(CACHE, '.trava'), 'w') as trava:
        fcntl.flock(trava, fcntl.LOCK_EX)          # 2º plano e pedido na hora nunca baixam juntos
        pasta_bin = os.path.join(CACHE, 'llama-' + BUILD)
        cli = os.path.join(pasta_bin, 'llama-mtmd-cli')
        if not os.path.exists(cli):
            tgz = os.path.join(CACHE, 'llama-%s.tar.gz' % BUILD)
            baixa(BIN_URL, tgz)
            with tarfile.open(tgz) as t:
                try:
                    t.extractall(CACHE, filter='data')   # Python 3.12+: extração segura
                except TypeError:
                    t.extractall(CACHE)
            os.remove(tgz)
        repo, modelo, mmproj = MODELOS[chave]
        m = os.path.join(CACHE, modelo)
        p = os.path.join(CACHE, mmproj)
        baixa(HF % (repo, modelo), m)
        baixa(HF % (repo, mmproj), p)
        with open(os.path.join(CACHE, '.pronto-' + chave), 'w') as f:   # o turno só guarda o cache com isto
            f.write(time.strftime('%Y-%m-%d %H:%M:%S'))
    return cli, m, p


def main():
    args = sys.argv[1:]
    chave = PADRAO
    if '--modelo' in args:
        i = args.index('--modelo')
        chave = args[i + 1]
        del args[i:i + 2]
    pergunta = ''
    if '--pergunta' in args:
        i = args.index('--pergunta')
        pergunta = args[i + 1]
        del args[i:i + 2]
    t0 = time.time()
    if args and args[0] == '--preparar':
        try:
            prepara(chave)
            responde({'ok': True, 'preparado': chave, 'segundos': round(time.time() - t0, 1)})
        except Exception as e:
            responde({'ok': False, 'motivo': 'preparo falhou: ' + str(e)[:200]})
    if not args:
        responde({'ok': False, 'motivo': 'sem imagem'})
    imagem = args[0]
    if not os.path.exists(imagem):
        responde({'ok': False, 'motivo': 'a imagem não está aqui: ' + imagem})
    try:
        cli, m, p = prepara(chave)
    except Exception as e:
        responde({'ok': False, 'motivo': 'não consegui preparar a visão local: ' + str(e)[:200]})
    pedido = ('Descreva esta imagem em português do Brasil, de forma objetiva e curta (até 8 linhas): o que aparece '
              '(objetos, formas, pessoas, cores, cenário) e transcreva EXATAMENTE qualquer texto visível. '
              'Use "parece" quando não tiver certeza. Não invente.')
    if pergunta.strip():
        pedido += ' Depois, responda em 1 ou 2 linhas a pergunta do dono: ' + pergunta.strip()[:400]
    env = dict(os.environ, LD_LIBRARY_PATH=os.path.dirname(cli))
    cmd = [cli, '-m', m, '--mmproj', p, '--image', imagem, '-p', pedido,
           '-n', '320', '--temp', '0.2', '--repeat-penalty', '1.1', '-t', str(max(1, os.cpu_count() or 1)), '-c', '8192']
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=300, env=env)
    except subprocess.TimeoutExpired:
        responde({'ok': False, 'motivo': 'a visão local passou de 5 min', 'modelo': chave})
    texto = (r.stdout or '').strip()
    if r.returncode != 0 or len(texto) < 8:
        responde({'ok': False, 'motivo': 'llama-mtmd-cli saiu com %s: %s' % (r.returncode, (r.stderr or '')[-240:]), 'modelo': chave})
    # modelo pequeno às vezes só REPETE o pedido (visto com o SmolVLM-500M na foto da horta) — isso não é descrição
    eco = [f for f in ('transcreva EXATAMENTE', 'Não invente', 'pergunta do dono', 'de forma objetiva e curta', 'objetos, formas, pessoas, cores') if f.lower() in texto.lower()]
    if eco:
        responde({'ok': False, 'motivo': 'o modelo repetiu o pedido em vez de descrever (' + ', '.join(eco) + ')', 'modelo': chave})
    # ... ou entra em REPETIÇÃO ("formas, pessoas, cores, formas, pessoas, cores...") — também não é descrição
    palavras = texto.lower().split()
    quadras = {}
    for i in range(max(0, len(palavras) - 3)):
        q = ' '.join(palavras[i:i + 4])
        quadras[q] = quadras.get(q, 0) + 1
    if quadras and max(quadras.values()) >= 4:
        responde({'ok': False, 'motivo': 'o modelo entrou em repetição', 'modelo': chave})
    responde({'ok': True, 'texto': texto[:3000], 'modelo': chave, 'segundos': round(time.time() - t0, 1)})


main()
