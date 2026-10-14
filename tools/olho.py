#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 👁️ OLHO LOCAL DA CASA (14/10/2026) — descreve formas e cores de uma imagem SEM internet e SEM motores.
# É a segunda rede de segurança da visão: quando os motores gratuitos saturam, a lupa lê o TEXTO e
# este olho lê as FORMAS/CORES por análise de pixels. Simples e honesto: bom para imagens de traço e
# para blocos grandes; em foto bagunçada, avisa que não deu para detalhar.
# Uso: python3 tools/olho.py /caminho/imagem.png  → JSON {"descricao": "...", "formas": [...]}.
import json
import sys

PALETA = {
    'vermelho': (220, 30, 30), 'azul': (0, 90, 200), 'verde': (20, 160, 70),
    'amarelo': (245, 200, 30), 'laranja': (240, 140, 30), 'roxo': (130, 60, 180),
    'rosa': (240, 120, 180), 'marrom': (120, 80, 50), 'ciano': (40, 200, 200),
    'vinho': (130, 20, 40), 'creme': (245, 240, 220),
}
CLAROS = {'branco', 'creme', 'amarelo'}
ESCUROS = {'preto'}


def falha(msg):
    print(json.dumps({'descricao': '', 'formas': [], 'erro': str(msg)[:160]}))
    sys.exit(0)


def nome_cor(rgb):
    r, g, b = int(rgb[0]), int(rgb[1]), int(rgb[2])
    if r > 225 and g > 225 and b > 225:
        return 'branco'
    if r < 45 and g < 45 and b < 45:
        return 'preto'
    if abs(r - g) < 18 and abs(g - b) < 18 and abs(r - b) < 18:
        return 'cinza'
    melhor, dist = 'outro', 1e9
    for nome, alvo in PALETA.items():
        d = (r - alvo[0]) ** 2 + (g - alvo[1]) ** 2 + (b - alvo[2]) ** 2
        if d < dist:
            melhor, dist = nome, d
    return melhor


def main():
    if len(sys.argv) < 2:
        falha('sem imagem')
    try:
        from PIL import Image
        import numpy as np
    except Exception as e:
        falha('bibliotecas: ' + str(e))
    try:
        img = Image.open(sys.argv[1]).convert('RGB')
    except Exception as e:
        falha('não abri a imagem: ' + str(e))

    # reduz para o olho não demorar (mantém proporção)
    largura_max = 320
    if img.size[0] > largura_max or img.size[1] > largura_max:
        escala = largura_max / max(img.size)
        img = img.resize((max(8, int(img.size[0] * escala)), max(8, int(img.size[1] * escala))), Image.LANCZOS)
    arr = np.asarray(img).astype(int)
    H, W = arr.shape[0], arr.shape[1]

    # fundo = cor mais comum (quantizada)
    q = (arr // 24) * 24
    cores, contagens = np.unique(q.reshape(-1, 3), axis=0, return_counts=True)
    fundo_rgb = cores[int(np.argmax(contagens))]
    fundo = nome_cor(fundo_rgb)
    dist_fundo = np.sqrt(((arr - fundo_rgb) ** 2).sum(axis=2))

    # máscara dos pixels "de forma": longe do fundo e de cor saturada
    nomes = np.empty((H, W), dtype=object)
    for y in range(H):
        for x in range(W):
            nomes[y, x] = nome_cor(arr[y, x])
    def fora_do_fundo(y, x):
        return dist_fundo[y, x] > 60

    visitado = np.zeros((H, W), dtype=bool)
    formas = []
    area_min = max(30, int(0.004 * H * W))
    for y0 in range(H):
        for x0 in range(W):
            if visitado[y0, x0]:
                continue
            visitado[y0, x0] = True
            if not fora_do_fundo(y0, x0):
                continue
            pilha = [(y0, x0)]
            px = []
            while pilha:
                y, x = pilha.pop()
                px.append((y, x))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and not visitado[yy, xx] and fora_do_fundo(yy, xx):
                        visitado[yy, xx] = True
                        pilha.append((yy, xx))
            if len(px) < area_min:
                continue
            ys = [p[0] for p in px]
            xs = [p[1] for p in px]
            y1, y2, x1, x2 = min(ys), max(ys), min(xs), max(xs)
            alt, larg = (y2 - y1 + 1), (x2 - x1 + 1)
            area = len(px)
            preenchimento = area / float(alt * larg)
            # perfil de largura por linha (amostra de 5 linhas) — separa triângulo de bloco
            linhas = [y1 + int((y2 - y1) * f) for f in (0.05, 0.5, 0.95)]
            larguras = []
            for ly in linhas:
                colunas = [x for (yy, x) in px if yy == ly]
                larguras.append((max(colunas) - min(colunas) + 1) if colunas else 0)

            # cor dominante do bloco
            from collections import Counter
            c = Counter(nomes[yy, xx] for (yy, xx) in px)
            cor = c.most_common(1)[0][0]
            proporcao_cor = c.most_common(1)[0][1] / float(area)

            razao = larg / float(alt)
            if cor in ('preto', 'cinza') and preenchimento < 0.88:
                continue  # letras/traços escuros não são "formas" (o texto já vem pela lupa)
            elif preenchimento >= 0.90:
                tipo = 'quadrado' if 0.8 <= razao <= 1.25 else 'retângulo'
            elif preenchimento >= 0.65:
                tipo = 'círculo' if 0.75 <= razao <= 1.33 else 'elipse'
            elif larguras[2] > 0 and larguras[0] <= 0.35 * larguras[2] and abs(larguras[1] - (larguras[0] + larguras[2]) / 2) <= 0.3 * larguras[2]:
                tipo = 'triângulo'
            elif preenchimento < 0.25:
                tipo = 'traço/linha'
            else:
                tipo = 'forma irregular'
            if proporcao_cor < 0.5:
                continue

            cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
            horiz = 'esquerda' if cx < W / 3 else ('centro' if cx < 2 * W / 3 else 'direita')
            vert = 'em cima' if cy < H / 3 else ('no meio' if cy < 2 * H / 3 else 'embaixo')
            formas.append({'cor': cor, 'tipo': tipo, 'posicao': horiz + ', ' + vert,
                           'tamanho_pct': round(100.0 * area / (H * W), 1)})

    formas.sort(key=lambda f: -f['tamanho_pct'])
    if not formas:
        descricao = 'não encontrei blocos de forma/cores claros (deve ser foto; para descrição fina, os motores de visão)'
    else:
        descricao = 'fundo ' + fundo + '; ' + '; '.join(
            '%s %s (%s)' % (f['tipo'], f['cor'], f['posicao']) for f in formas[:6])
    print(json.dumps({'descricao': descricao, 'formas': formas[:6]}))


main()
