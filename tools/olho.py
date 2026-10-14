#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 👁️ OLHO LOCAL DA CASA v4 (14/10/2026) — descreve a imagem SEM internet e SEM motores.
# v1: formas e cores de traço. v2: paleta, brilho, orientação, faixas, documento/print.
# v3: ROSTOS (opencv haar, offline — "quanta gente aparece"), nitidez (foto tremida?) e
#     preto-e-branco/cor. v4: LEITURA DE CENA em faixas ("de cima para baixo: céu; vegetação; areia").
#     Tudo medido; nada inventado: quando não dá, ele diz que não dá.
# Uso: python3 tools/olho.py /caminho/imagem.png  → JSON {"descricao", "formas", "paleta", "rostos"}.
import json
import sys

PALETA = {
    'vermelho': (220, 30, 30), 'azul': (0, 90, 200), 'verde': (20, 160, 70),
    'amarelo': (245, 200, 30), 'laranja': (240, 140, 30), 'roxo': (130, 60, 180),
    'rosa': (240, 120, 180), 'marrom': (120, 80, 50), 'ciano': (40, 200, 200),
    'vinho': (130, 20, 40), 'creme': (245, 240, 220),
}


def falha(msg):
    print(json.dumps({'descricao': '', 'pistas': '', 'formas': [], 'paleta': [], 'rostos': 0, 'erro': str(msg)[:160]}))
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


def rostos(caminho, H, W):
    """Quantos rostos? (opencv offline; se não tiver opencv, devolve None — melhor não saber do que errar.)"""
    try:
        import cv2
        if not hasattr(cv2, 'CascadeClassifier'):
            return None
        casc = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        if casc.empty():
            return None
        img = cv2.imread(caminho)
        if img is None:
            return None
        cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        achados = casc.detectMultiScale(cinza, scaleFactor=1.1, minNeighbors=7, minSize=(max(40, H // 8), max(40, H // 8)))
        detalhes = []
        for (x, y, w, h) in achados[:4]:
            cx, cy = (x + w / 2.0) / W, (y + h / 2.0) / H
            horiz = 'esquerda' if cx < 0.4 else ('centro' if cx < 0.6 else 'direita')
            vert = 'em cima' if cy < 0.4 else ('no meio' if cy < 0.6 else 'embaixo')
            detalhes.append(horiz + ', ' + vert)
        return {'n': len(achados), 'onde': detalhes}
    except Exception:
        return None


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

    largura_max = 320
    if max(img.size) > largura_max:
        escala = largura_max / max(img.size)
        img = img.resize((max(8, int(img.size[0] * escala)), max(8, int(img.size[1] * escala))), Image.LANCZOS)
    arr = np.asarray(img).astype(int)
    H, W = arr.shape[0], arr.shape[1]

    # rostos na imagem CHEIA (não na reduzida — o haar precisa de detalhe)
    det = rostos(sys.argv[1], H, W)

    q = (arr // 24) * 24
    cores, contagens = np.unique(q.reshape(-1, 3), axis=0, return_counts=True)
    fundo_rgb = cores[int(np.argmax(contagens))]
    fundo = nome_cor(fundo_rgb)
    dist_fundo = np.sqrt(((arr - fundo_rgb) ** 2).sum(axis=2))
    fora = dist_fundo > 60

    nomes = np.empty((H, W), dtype=object)
    for y in range(H):
        for x in range(W):
            nomes[y, x] = nome_cor(arr[y, x])

    visitado = np.zeros((H, W), dtype=bool)
    formas = []
    area_min = max(30, int(0.004 * H * W))
    for y0 in range(H):
        for x0 in range(W):
            if visitado[y0, x0]:
                continue
            visitado[y0, x0] = True
            if not fora[y0, x0]:
                continue
            pilha = [(y0, x0)]
            px = []
            while pilha:
                y, x = pilha.pop()
                px.append((y, x))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and not visitado[yy, xx] and fora[yy, xx]:
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
            from collections import Counter
            c = Counter(nomes[yy, xx] for (yy, xx) in px)
            cor = c.most_common(1)[0][0]
            if cor in ('preto', 'cinza') and preenchimento < 0.88:
                continue
            if c.most_common(1)[0][1] / float(area) < 0.5:
                continue
            linha5, linha50, linha95 = y1 + int((y2 - y1) * 0.05), y1 + int((y2 - y1) * 0.5), y1 + int((y2 - y1) * 0.95)
            larguras = []
            for ly in (linha5, linha50, linha95):
                colunas = [x for (yy, x) in px if yy == ly]
                larguras.append((max(colunas) - min(colunas) + 1) if colunas else 0)
            razao = larg / float(alt)
            if preenchimento >= 0.90:
                tipo = 'quadrado' if 0.8 <= razao <= 1.25 else 'retângulo'
            elif preenchimento >= 0.65:
                tipo = 'círculo' if 0.75 <= razao <= 1.33 else 'elipse'
            elif larguras[2] > 0 and larguras[0] <= 0.35 * larguras[2] and abs(larguras[1] - (larguras[0] + larguras[2]) / 2) <= 0.3 * larguras[2]:
                tipo = 'triângulo'
            elif preenchimento < 0.25:
                tipo = 'traço/linha'
            else:
                tipo = 'forma irregular'
            cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
            horiz = 'esquerda' if cx < W / 3 else ('centro' if cx < 2 * W / 3 else 'direita')
            vert = 'em cima' if cy < H / 3 else ('no meio' if cy < 2 * H / 3 else 'embaixo')
            formas.append({'cor': cor, 'tipo': tipo, 'posicao': horiz + ', ' + vert,
                           'tamanho_pct': round(100.0 * area / (H * W), 1)})
    formas.sort(key=lambda f: -f['tamanho_pct'])
    formas = formas[:6]

    cinza = (arr[:, :, 0] * 0.299 + arr[:, :, 1] * 0.587 + arr[:, :, 2] * 0.114)
    brilho = float(cinza.mean())
    nivel = 'clara' if brilho > 170 else ('escura' if brilho < 85 else 'de brilho médio')
    orient = 'paisagem (deitada)' if W > H * 1.15 else ('retrato (em pé)' if H > W * 1.15 else 'quadrada')
    grad = np.abs(np.gradient(cinza)[0]) + np.abs(np.gradient(cinza)[1])
    densidade = float((grad > 25).mean())
    rotulo_det = 'muito detalhada (cara de foto)' if densidade > 0.12 else ('simples (cara de desenho/documento)' if densidade < 0.045 else 'detalhe médio')
    nitidez = float(np.var(np.gradient(cinza)[0]) + np.var(np.gradient(cinza)[1]))
    tremida = nitidez < 18.0

    # preto e branco? (saturação média baixa E pouca diferença entre canais)
    dif_canais = float(np.mean(np.abs(arr[:, :, 0] - arr[:, :, 2]) + np.abs(arr[:, :, 1] - arr[:, :, 2])) / 2)
    pb = dif_canais < 10

    cores_px = arr[fora] if fora.any() else arr.reshape(-1, 3)
    paleta = []
    if len(cores_px):
        passos = ((cores_px // 40) * 40)
        uniq, cnt = np.unique(passos, axis=0, return_counts=True)
        ordem = np.argsort(cnt)[::-1][:6]
        total = float(cnt.sum())
        vistos = set()
        for i in ordem:
            nome = nome_cor(uniq[i])
            if nome in vistos:
                continue
            vistos.add(nome)
            paleta.append({'cor': nome, 'pct': round(100.0 * cnt[i] / total, 1)})
            if len(paleta) >= 3:
                break

    # 🌅 v4: LEITURA DE CENA em faixas horizontais ("de cima para baixo") — céu, vegetação, água, terra...
    def cara_de(cor, lisa, detalhada, pos, brilho_b):
        if pos == 'em cima' and cor in ('azul', 'ciano') and lisa and brilho_b > 120:
            return 'céu'
        if pos != 'em cima' and cor in ('azul', 'ciano', 'azul-escuro') and lisa and brilho_b > 60:
            return 'água/mar'
        if cor == 'verde':
            return 'vegetação/plantas' if detalhada else 'grama ou vegetação lisa'
        if cor == 'verde-escuro':
            return 'vegetação escura'
        if pos == 'embaixo' and cor in ('bege', 'creme', 'amarelo', 'marrom') and lisa:
            return 'areia ou terra'
        if cor in ('cinza', 'branco', 'creme') and lisa and detalhada is False:
            return 'parede ou fundo'
        if cor == 'azul' and lisa:
            return 'azul liso'
        return None

    alturas = [('em cima', 0, H // 3), ('no meio', H // 3, 2 * H // 3), ('embaixo', 2 * H // 3, H)]
    faixas_cena, faixas_detalhe = [], []
    for nome_f, y1b, y2b in alturas:
        if y2b <= y1b:
            continue
        rec = arr[y1b:y2b]
        g_rec = grad[y1b:y2b]
        cor_f = nome_cor(rec.reshape(-1, 3).mean(axis=0))
        det_f = float((g_rec > 25).mean())
        lis_f = det_f < 0.09
        det_alto = det_f > 0.14
        b_f = float(cinza[y1b:y2b].mean())
        cara = cara_de(cor_f, lis_f, det_alto, nome_f, b_f)
        faixas_detalhe.append((nome_f, cor_f, det_f))
        faixas_cena.append((nome_f, cor_f, ('liso' if lis_f else ('detalhado' if det_alto else '')), cara))
    # só vira frase se as faixas se DIFERENCIAM (senão é imagem de uma cor só)
    cores_faixas = [f[1] for f in faixas_cena]
    leitura_cena = ''
    if len(set(cores_faixas)) > 1 or any(f[3] for f in faixas_cena):
        pedacos_cena = []
        for nome_f, cor_f, text_f, cara in faixas_cena:
            ped = nome_f + ': ' + cor_f + (' ' + text_f if text_f else '')
            if cara:
                ped += ' (cara de ' + cara + ')'
            pedacos_cena.append(ped)
        leitura_cena = 'de cima para baixo — ' + '; '.join(pedacos_cena)

    frac_escuro = float((cinza < 110).mean())
    # documento/print exige também pouca cor (papel não é colorido) — 14/10: o retrato colorido enganava
    parece_doc = (fundo in ('branco', 'creme')) and 0.01 <= frac_escuro <= 0.35 and brilho > 165 and dif_canais < 22
    faixa = ''
    if H >= 40:
        topo = arr[:max(1, H // 4)].reshape(-1, 3)
        base = arr[-max(1, H // 4):].reshape(-1, 3)
        ctopo, cbase = nome_cor(topo.mean(axis=0)), nome_cor(base.mean(axis=0))
        if ctopo != cbase and ctopo != 'outro':
            faixa = 'metade de cima tende a ' + ctopo + ', a de baixo a ' + cbase

    partes = []
    if formas:
        partes.append('fundo ' + fundo + '; ' + '; '.join(
            '%s %s (%s)' % (f['tipo'], f['cor'], f['posicao']) for f in formas))
    if det and det['n'] > 0:
        partes.append('detectei ' + str(det['n']) + ' rosto(s) provavel(is) de pessoa (' + '; '.join(det['onde']) + ')')
    if parece_doc:
        partes.append('parece documento/print com texto (muito traço escuro em fundo claro)')
    if paleta and not formas:
        partes.append('paleta dominante: ' + ', '.join('%s %s%%' % (p['cor'], p['pct']) for p in paleta))
    partes.append('imagem ' + orient + ', ' + nivel + ' (' + rotulo_det + ')')
    if pb:
        partes.append('sem cor (preto e branco/cinza)')
    if tremida:
        partes.append('meio desfocada (pode ter saído tremida)')
    if leitura_cena:
        partes.append(leitura_cena)
    if faixa and not formas:
        partes.append(faixa)
    if not formas and not (det and det['n'] > 0) and densidade > 0.12:
        partes.append('olho local não detalha cena de foto — para isso, os motores de visão (ou o texto pela lupa)')
    descricao = '; '.join(partes)
    # 🎯 'pistas': resumo curto e medido (entra no prompt dos motores de visão como apoio)
    pedacos_pista = []
    if det and det['n'] > 0:
        pedacos_pista.append('detectei ' + str(det['n']) + ' rosto(s) provável(is) de pessoa (' + '; '.join(det['onde']) + ')')
    if leitura_cena:
        pedacos_pista.append(leitura_cena)
    if tremida:
        pedacos_pista.append('foto possivelmente tremida/desfocada')
    pistas = '; '.join(pedacos_pista)
    print(json.dumps({'descricao': descricao, 'pistas': pistas, 'formas': formas, 'paleta': paleta,
                      'rostos': (det or {}).get('n', 0)}))


main()
