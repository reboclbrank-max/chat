#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 👁️‍🗨️ VISÃO LOCAL DA CASA v1.7 (17/10/2026) — descreve a foto com um modelo de visão que roda AQUI MESMO
# (llama.cpp na CPU do runner). Nada de serviço de terceiros: quando os motores de visão da internet caem
# (504/502, como na madrugada de 15/10), a casa ainda VÊ a foto.
# v1.4: FOTO DE CELULAR — (1) desvira pela marca EXIF (o llama.cpp não lê a orientação: foto em pé chegava
#       deitada) e reduz para até ~0,8 MP (12 MP virariam até 4096 tokens de imagem na CPU); qualquer formato que
#       o Pillow leia (WEBP do WhatsApp, por exemplo) vira JPEG; (2) se o modelo descreve bem e só no fim entra em
#       laço, a parte boa é aproveitada (antes, tudo era descartado — rodada 16, R3-12); (3) modelo 'qwen3vl-4b'
#       (GGUF oficial da Qwen, Q4_K_M); (4) pedido 'detalhado' opcional (VISAO_PEDIDO=detalhado), neutro — não sugere
#       objetos (pista no pedido faz modelo inventar); (5) o JSON traz 'imagem' (tamanho/redução/desvirada).
# v1.5 (exame #3 no runner): modelo padrão QWEN3-VL-4B (formas 5/5, horta 4/4 — viu o regador —, 58 s/foto; o 2B
#       dava 3/5 e 3/4, 44 s); o laço é cortado na 2ª ocorrência (a 1ª é conteúdo: o 2B repetia o texto lido e o
#       corte levava o texto junto); o eco da pergunta do dono e linhas soltas ("parece") saem da descrição.
# v1.7: o pedido pede nomes específicos e usuais do português brasileiro para objetos visíveis, sem sugerir quais
#       objetos procurar. Isso reduz descrições vagas (ex.: nomear a ferramenta, não apenas a ação), mantendo incerteza
#       explícita e a proibição de inventar.
# v1.6: 🧠 CÉREBRO LOCAL DE TEXTO (--texto): o mesmo modelo responde só com texto (llama-completion, formato de conversa
#       do Qwen), para quando todos os motores de texto da internet caem; a pergunta pode vir por arquivo.
# Uso:
#   python3 tools/visao-local.py --preparar              → baixa binário + modelo (para o turno rodar em 2º plano)
#   python3 tools/visao-local.py foto.png [--pergunta "..."] [--modelo chave]   → JSON na stdout
import atexit
import fcntl
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.request

BUILD = 'b11635'   # llama.cpp fixado (reprodutível); binário CPU Ubuntu x64, ~18 MB
BIN_URL = ('https://github.com/ggml-org/llama.cpp/releases/download/%s/llama-%s-bin-ubuntu-x64.tar.gz' % (BUILD, BUILD))
HF = 'https://huggingface.co/%s/resolve/main/%s'
MODELOS = {
    # chave: (repositório, modelo, projetor de imagem)
    'qwen3vl-2b': ('ggml-org/Qwen3-VL-2B-Instruct-GGUF', 'Qwen3-VL-2B-Instruct-Q8_0.gguf', 'mmproj-Qwen3-VL-2B-Instruct-Q8_0.gguf'),
    'qwen3vl-4b': ('Qwen/Qwen3-VL-4B-Instruct-GGUF', 'Qwen3VL-4B-Instruct-Q4_K_M.gguf', 'mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf'),
    'internvl3-2b': ('ggml-org/InternVL3-2B-Instruct-GGUF', 'InternVL3-2B-Instruct-Q4_K_M.gguf', 'mmproj-InternVL3-2B-Instruct-Q8_0.gguf'),
    'gemma4-e2b': ('ggml-org/gemma-4-E2B-it-GGUF', 'gemma-4-E2B-it-Q4_0.gguf', 'mmproj-gemma-4-E2B-it-Q8_0.gguf'),
    'gemma3-4b': ('ggml-org/gemma-3-4b-it-GGUF', 'gemma-3-4b-it-Q4_K_M.gguf', 'mmproj-model-f16.gguf'),
    'smol-500m': ('ggml-org/SmolVLM-500M-Instruct-GGUF', 'SmolVLM-500M-Instruct-Q8_0.gguf', 'mmproj-SmolVLM-500M-Instruct-Q8_0.gguf'),
    'smollm2-135m': ('bartowski/SmolLM2-135M-Instruct-GGUF', 'SmolLM2-135M-Instruct-IQ4_XS.gguf', None),   # só texto (testes)
}
PADRAO = os.environ.get('VISAO_MODELO', 'qwen3vl-4b')
CACHE = os.environ.get('VISAO_CACHE', os.path.expanduser('~/.cache/visao-casa'))
MAX_PIXELS = int(os.environ.get('VISAO_MAX_PIXELS', '800000'))   # ~0,8 MP ≈ 780 tokens de imagem no Qwen3-VL
PEDIDO_MODO = os.environ.get('VISAO_PEDIDO', 'normal')
temporarios = []
atexit.register(lambda: [os.remove(t) for t in temporarios if os.path.exists(t)])


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
        p = os.path.join(CACHE, mmproj) if mmproj else None
        baixa(HF % (repo, modelo), m)
        if mmproj:
            baixa(HF % (repo, mmproj), p)
        with open(os.path.join(CACHE, '.pronto-' + chave), 'w') as f:   # o turno só guarda o cache com isto
            f.write(time.strftime('%Y-%m-%d %H:%M:%S'))
    return cli, m, p


def prepara_imagem(caminho):
    """v1.4: desvira pela marca EXIF, reduz para até MAX_PIXELS e garante um formato que o llama.cpp lê.
    Devolve (caminho_para_o_modelo, descrição_curta). Sem Pillow, segue com a imagem original."""
    if os.environ.get('VISAO_SEM_PREPARO') == '1':      # só para o exame comparar com o caminho antigo
        return caminho, 'original (preparo desligado para comparação)'
    try:
        from PIL import Image, ImageOps
    except Exception:
        return caminho, 'original (sem Pillow)'
    try:
        with Image.open(caminho) as im:
            w0, h0 = im.size
            formato = im.format or '?'
            try:
                orient = int(im.getexif().get(0x0112, 1) or 1)
            except Exception:
                orient = 1
            escala = min(1.0, (MAX_PIXELS / float(max(1, w0 * h0))) ** 0.5)
            if escala >= 0.999 and orient == 1 and formato in ('PNG', 'JPEG'):
                return caminho, '%dx%d (original)' % (w0, h0)
            im2 = ImageOps.exif_transpose(im)
            w, h = im2.size
            if escala < 0.999:
                im2 = im2.resize((max(32, int(round(w * escala))), max(32, int(round(h * escala)))), Image.LANCZOS)
            if im2.mode in ('RGBA', 'LA', 'P'):
                im2 = im2.convert('RGBA')
                fundo = Image.new('RGB', im2.size, (255, 255, 255))
                fundo.paste(im2, mask=im2.split()[-1])
                im2 = fundo
            else:
                im2 = im2.convert('RGB')
            fd, saida = tempfile.mkstemp(prefix='visao-', suffix='.jpg')
            os.close(fd)
            temporarios.append(saida)
            im2.save(saida, 'JPEG', quality=90)
            partes = ['%dx%d %s → %dx%d' % (w0, h0, formato, im2.size[0], im2.size[1])]
            if orient != 1:
                partes.append('desvirada (EXIF %d)' % orient)
            return saida, ' · '.join(partes)
    except Exception as e:
        return caminho, 'original (não preparei: %s)' % str(e)[:80]


def corta_laco(texto):
    """v1.4: se o modelo entra em laço, devolve (parte_boa, True) quando o que vem antes do laço é uma descrição
    útil; (texto, False) se não há laço; (None, True) se não sobra nada aproveitável."""
    spans = [m.span() for m in re.finditer(r'\S+', texto)]
    palavras = [texto[a:b].lower().strip('.,;:!?()"«»*-–—') for a, b in spans]
    ocorre = {}
    for i in range(max(0, len(palavras) - 3)):
        ocorre.setdefault(' '.join(palavras[i:i + 4]), []).append(i)
    if not ocorre or max(len(v) for v in ocorre.values()) < 4:
        return texto, False
    pior = max(ocorre.values(), key=len)
    corte = pior[1]                                   # v1.5: a 1ª ocorrência é conteúdo; o laço começa na 2ª
    boa = texto[:spans[corte][0]].rstrip(' \t\n,;:-–—*')
    boa = re.sub(r'(\s+(e|de|da|do|com|ou|a|o|um|uma|que))+$', '', boa, flags=re.I)   # sem conectivo solto no fim
    resto = [w.lower() for w in boa.split()]
    sub = {}
    for i in range(max(0, len(resto) - 3)):
        q = ' '.join(resto[i:i + 4])
        sub[q] = sub.get(q, 0) + 1
    if len(resto) >= 12 and (not sub or max(sub.values()) < 3):
        return boa, True
    return None, True


def limpa_eco(texto, pergunta):
    """v1.5: o modelo costuma repetir a pergunta do dono antes de responder, e às vezes solta uma linha só com
    "parece" — nada disso é descrição."""
    p = (pergunta or '').strip()
    if len(p) >= 12:
        texto = texto.replace(p, ' ')
        for frase in re.split(r'(?<=[.?!])\s+', p):     # também frase a frase ("O que você vê nela?")
            if len(frase) >= 12:
                texto = texto.replace(frase, ' ')
    linhas = [l.strip() for l in texto.splitlines()]
    linhas = [l for l in linhas if l.strip().lower().strip('.:*-– ') not in ('parece', 'pergunta', 'resposta')]
    texto = '\n'.join(linhas)
    texto = re.sub(r'[ \t]{2,}', ' ', texto)
    texto = re.sub(r'\n{3,}', '\n\n', texto)
    return texto.strip()


def responde_texto(chave, pergunta, t0):
    """v1.6: cérebro local de texto — formato de conversa do Qwen (ChatML) montado à mão, pelo llama-completion."""
    try:
        cli, m, p = prepara(chave)
    except Exception as e:
        responde({'ok': False, 'motivo': 'não consegui preparar o cérebro local: ' + str(e)[:200], 'modo': 'texto'})
    comp = os.path.join(os.path.dirname(cli), 'llama-completion')
    if not os.path.exists(comp):
        responde({'ok': False, 'motivo': 'llama-completion ausente nesta versão do llama.cpp', 'modo': 'texto'})
    sistema = ('Você é a Assistente Rebocl, do Brasil, direta e calorosa. Responda em português do Brasil, com clareza e no '
               'máximo 12 linhas. Não invente fatos; se não souber, diga que não sabe.')
    prompt = '<|im_start|>system\n' + sistema + '<|im_end|>\n<|im_start|>user\n' + pergunta.strip()[:9000] + '<|im_end|>\n<|im_start|>assistant\n'
    fd, arq = tempfile.mkstemp(prefix='cerebro-', suffix='.txt')
    os.close(fd)
    temporarios.append(arq)
    with open(arq, 'w', encoding='utf-8') as f:
        f.write(prompt)
    env = dict(os.environ, LD_LIBRARY_PATH=os.path.dirname(cli))
    cmd = [comp, '-m', m, '-f', arq, '-n', '480', '--temp', '0.3', '--repeat-penalty', '1.1', '-no-cnv', '--no-display-prompt',
           '-t', str(max(1, os.cpu_count() or 1)), '-c', '8192']
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=300, env=env)
    except subprocess.TimeoutExpired:
        responde({'ok': False, 'motivo': 'o cérebro local passou de 5 min', 'modelo': chave, 'modo': 'texto'})
    texto = (r.stdout or '').replace('[end of text]', '')
    texto = re.sub(r'<think>[\s\S]*?</think>', '', texto).split('<|im_end|>')[0].strip()
    if r.returncode != 0 or len(texto) < 2:
        responde({'ok': False, 'motivo': 'llama-completion saiu com %s: %s' % (r.returncode, (r.stderr or '')[-200:]), 'modelo': chave, 'modo': 'texto'})
    texto, cortado = corta_laco(texto)
    if texto is None:
        responde({'ok': False, 'motivo': 'o modelo entrou em repetição', 'modelo': chave, 'modo': 'texto'})
    responde({'ok': True, 'texto': texto[:4000], 'modelo': chave, 'segundos': round(time.time() - t0, 1), 'modo': 'texto'})


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
    if '--pergunta-arquivo' in args:   # v1.6: pergunta longa por arquivo
        i = args.index('--pergunta-arquivo')
        try:
            pergunta = open(args[i + 1], encoding='utf-8').read()
        except Exception:
            pergunta = ''
        del args[i:i + 2]
    if '--texto' in args:              # v1.6: cérebro local de texto
        args.remove('--texto')
        if not pergunta.strip():
            responde({'ok': False, 'motivo': 'sem pergunta', 'modo': 'texto'})
        responde_texto(chave, pergunta, t0)
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
    foto, info = prepara_imagem(imagem)
    pedido = ('Descreva esta imagem em português do Brasil, de forma objetiva e curta (até 8 linhas): o que aparece '
              '(objetos, formas, pessoas, cores, cenário), nomeando objetos reconhecíveis pelo termo mais específico '
              'e usual no Brasil, e transcreva EXATAMENTE qualquer texto visível. Use "parece" quando não tiver '
              'certeza. Não invente.')
    if PEDIDO_MODO == 'detalhado':
        pedido = ('Descreva esta imagem em português do Brasil, em até 10 linhas: o que aparece (objetos, formas, pessoas, '
                  'animais, cores, cenário), incluindo os objetos pequenos e o que está ao fundo e nomeando objetos '
                  'reconhecíveis pelo termo mais específico e usual no Brasil. Transcreva EXATAMENTE qualquer texto visível. '
                  'Use "parece" quando não tiver certeza. Não invente.')
    if pergunta.strip():
        pedido += ' Depois, responda em 1 ou 2 linhas a pergunta do dono: ' + pergunta.strip()[:400]
    env = dict(os.environ, LD_LIBRARY_PATH=os.path.dirname(cli))
    cmd = [cli, '-m', m, '--mmproj', p, '--image', foto, '-p', pedido,
           '-n', ('400' if PEDIDO_MODO == 'detalhado' else '320'), '--temp', '0.2', '--repeat-penalty', '1.1',
           '-t', str(max(1, os.cpu_count() or 1)), '-c', '8192']
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=300, env=env)
    except subprocess.TimeoutExpired:
        responde({'ok': False, 'motivo': 'a visão local passou de 5 min', 'modelo': chave, 'imagem': info})
    texto = (r.stdout or '').strip()
    if r.returncode != 0 or len(texto) < 8:
        responde({'ok': False, 'motivo': 'llama-mtmd-cli saiu com %s: %s' % (r.returncode, (r.stderr or '')[-240:]), 'modelo': chave, 'imagem': info})
    # modelo pequeno às vezes só REPETE o pedido (visto com o SmolVLM-500M na foto da horta) — isso não é descrição
    eco = [f for f in ('transcreva EXATAMENTE', 'Não invente', 'pergunta do dono', 'de forma objetiva e curta', 'objetos, formas, pessoas, cores') if f.lower() in texto.lower()]
    if eco:
        responde({'ok': False, 'motivo': 'o modelo repetiu o pedido em vez de descrever (' + ', '.join(eco) + ')', 'modelo': chave, 'imagem': info})
    # ... ou entra em REPETIÇÃO no fim ("formas, pessoas, cores, formas, pessoas, cores...") — v1.4: aproveita o que veio antes
    texto, cortado = corta_laco(texto)
    if texto is not None:
        texto = limpa_eco(texto, pergunta)
    if texto is None or len(texto) < 8:
        responde({'ok': False, 'motivo': 'o modelo entrou em repetição', 'modelo': chave, 'imagem': info})
    saida = {'ok': True, 'texto': texto[:3000], 'modelo': chave, 'segundos': round(time.time() - t0, 1), 'imagem': info}
    if cortado:
        saida['cortado'] = 'o modelo entrou em repetição no fim; ficou só a parte antes do laço'
    if os.environ.get('VISAO_DIAG') == '1':
        saida['diag'] = ' | '.join(l.strip() for l in (r.stderr or '').splitlines() if re.search(r'encoded in|decoded in|eval time|load time|image', l))[-600:]
    responde(saida)


main()
