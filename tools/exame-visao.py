#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 🔬 EXAME DA VISÃO LOCAL v1 (15/10/2026) — compara configurações "modelo[+det]" nas fotos de prova, mede o tempo
# e PONTUA o que importa: formas + texto, bilhete, horta e a FOTO DE CELULAR (12 MP, gravada deitada com a marca
# EXIF 6, como o celular faz). Saída: markdown na stdout (o ferramentas.yml anexa ao relatório em provas/).
# Uso: python3 tools/exame-visao.py qwen3vl-2b,qwen3vl-2b+det,qwen3vl-4b,qwen3vl-4b+det [--cru]
#      +det  = pedido detalhado (VISAO_PEDIDO=detalhado) · --cru = também roda a foto de celular SEM o preparo
#              novo (caminho antigo), uma vez, no 1º modelo — para medir a diferença
import json
import os
import re
import subprocess
import sys
import time

HORTA = [r'horta|alface|couve|verdura|hortali|canteir|vegeta', r'regador', r'cachorr|\bc[ãa]o\b|cadel', r'cerca|estaca']
FOTOS = [
    ('formas', 'tools/teste-visao3.png', 'Leia todo o texto e liste as formas e cores.',
     [r'quadrado|square|ret[âa]ngulo', r'c[íi]rculo|circle', r'tri[âa]ngulo|triangle', r'CASA\s*REBOCL', r'14/10/2026']),
    ('bilhete', 'tools/foto-bilhete.png', 'O que está escrito e quem assinou?',
     [r'horta', r'varanda', r'trinco|port[ãa]o', r'marta']),
    ('horta', 'tools/foto-horta.jpg', 'Tirei essa foto do quintal agora. O que você vê nela? Descreve tudo que der.', HORTA),
    ('celular', 'tools/foto-celular.jpg', 'Tirei essa foto do quintal agora. O que você vê nela? Descreve tudo que der.', HORTA),
]
CACHE = os.environ.get('VISAO_CACHE', os.path.expanduser('~/.cache/visao-casa'))


def roda(args, env_extra, limite=420):
    env = dict(os.environ, **env_extra)
    t0 = time.time()
    try:
        r = subprocess.run([sys.executable, 'tools/visao-local.py'] + args, capture_output=True, text=True, timeout=limite, env=env)
        j = json.loads((r.stdout or '').strip().splitlines()[-1])
    except Exception as e:
        j = {'ok': False, 'motivo': 'exame: ' + str(e)[:160]}
    j['parede'] = round(time.time() - t0, 1)
    return j


def pontua(texto, regras):
    return sum(1 for rg in regras if re.search(rg, texto or '', re.I))


def apaga_modelos():
    for f in os.listdir(CACHE) if os.path.isdir(CACHE) else []:
        if f.endswith('.gguf') or f.startswith('.pronto-'):
            os.remove(os.path.join(CACHE, f))


def main():
    configs = [c.strip() for c in sys.argv[1].split(',') if c.strip()]
    cru = '--cru' in sys.argv
    nucleos = os.cpu_count() or 1
    try:
        ram = round(os.sysconf('SC_PAGE_SIZE') * os.sysconf('SC_PHYS_PAGES') / 1e9)
    except Exception:
        ram = '?'
    print('\n## 🔬 Visão local — exame comparativo (%s núcleos, %s GB de RAM)\n' % (nucleos, ram))
    print('Pontos: formas = quadrado/círculo/triângulo + "CASA REBOCL" + data (5) · bilhete = horta/varanda/portão/Marta (4) · '
          'horta e celular = canteiro/regador/cão/cerca (4). A foto de celular é a horta em 12 MP, gravada deitada com a marca EXIF 6.\n')
    resumo = []
    atual = None
    fez_cru = False
    for c in configs:
        modelo, _, extra = c.partition('+')
        modo = 'detalhado' if extra == 'det' else 'normal'
        if modelo != atual:
            if atual:
                apaga_modelos()
            p = roda(['--preparar', '--modelo', modelo], {}, limite=1200)
            print('### preparo de %s: %s (%s s)\n' % (modelo, 'ok' if p.get('ok') else 'FALHOU — ' + str(p.get('motivo')), p.get('segundos', p['parede'])))
            atual = modelo
            if not p.get('ok'):
                resumo.append((c, None))
                continue
        print('### %s · pedido %s\n' % (modelo, modo))
        pontos = {}
        for nome, foto, pergunta, regras in FOTOS:
            j = roda([foto, '--modelo', modelo, '--pergunta', pergunta], {'VISAO_PEDIDO': modo})
            texto = j.get('texto') or ''
            n = pontua(texto, regras)
            seg = j.get('segundos') or j['parede']
            pontos[nome] = (n, len(regras), seg, bool(j.get('ok')))
            print('- **%s** · %d/%d · %.1f s · %s%s' % (nome, n, len(regras), seg, j.get('imagem', ''), ' · ✂️ cortado antes do laço' if j.get('cortado') else ''))
            print('  > ' + (texto or ('FALHOU: ' + str(j.get('motivo', ''))))[:420].replace('\n', ' / '))
        if cru and not fez_cru:
            fez_cru = True
            j = roda(['tools/foto-celular.jpg', '--modelo', modelo, '--pergunta', FOTOS[3][2]], {'VISAO_PEDIDO': modo, 'VISAO_SEM_PREPARO': '1'})
            texto = j.get('texto') or ''
            print('- **celular SEM o preparo novo (caminho antigo)** · %d/4 · %.1f s' % (pontua(texto, HORTA), j.get('segundos') or j['parede']))
            print('  > ' + (texto or ('FALHOU: ' + str(j.get('motivo', ''))))[:420].replace('\n', ' / '))
        print()
        resumo.append((c, pontos))
    apaga_modelos()
    print('### Resumo\n')
    print('| configuração | formas | bilhete | horta | celular | tempo médio |')
    print('|---|---|---|---|---|---|')
    for c, pontos in resumo:
        if not pontos:
            print('| %s | — | — | — | — | preparo falhou |' % c)
            continue
        cel = []
        for nome in ('formas', 'bilhete', 'horta', 'celular'):
            n, tot, seg, ok = pontos[nome]
            cel.append(('%d/%d' % (n, tot)) if ok else 'falhou')
        media = sum(v[2] for v in pontos.values()) / len(pontos)
        print('| %s | %s | %.0f s |' % (c, ' | '.join(cel), media))


main()
