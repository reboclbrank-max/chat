#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 🔤 OCR LOCAL DA CASA v1 (14/10/2026) — lê TEXTO de imagem SEM internet e SEM terceiros.
# Motor: tesseract (por+eng) quando instalado no runner. Se não houver motor, ele diz que
# não há — o olho local e a lupa continuam funcionando do jeito que estavam.
# Uso: python3 tools/ocr-local.py /caminho/imagem.png  → JSON na stdout.
import json
import os
import subprocess
import sys
from shutil import which


def falha(msg):
    print(json.dumps({'ok': False, 'motivo': msg}, ensure_ascii=False))
    sys.exit(0)


def tesseract(caminho, extra):
    langs = ['por+eng', 'por', 'eng']
    ultima = ''
    for lang in langs:
        r = subprocess.run(['tesseract', caminho, 'stdout', '-l', lang] + extra,
                           capture_output=True, text=True, timeout=180)
        if r.returncode == 0:
            return r.stdout or ''
        ultima = (r.stderr or '')[-160:]
    raise RuntimeError(ultima or 'tesseract não respondeu')


def confianca(caminho):
    try:
        t = tesseract(caminho, ['--psm', '3', 'tsv'])
        vals = []
        for linha in t.splitlines()[1:]:
            p = linha.split('\t')
            if len(p) >= 12 and p[11].strip():
                try:
                    vals.append(float(p[10]))
                except ValueError:
                    pass
        return round(sum(vals) / len(vals), 1) if vals else None
    except Exception:
        return None


def main():
    if len(sys.argv) < 2:
        falha('sem imagem')
    caminho = sys.argv[1]
    if not os.path.exists(caminho):
        falha('a imagem não está aqui: ' + caminho)

    if which('tesseract'):
        try:
            bruto = tesseract(caminho, ['--psm', '3'])
            texto = ' '.join(bruto.split())
            if len(texto) >= 3:
                print(json.dumps({'ok': True, 'motor': 'tesseract', 'texto': texto[:3000],
                                  'linhas': len([l for l in bruto.splitlines() if l.strip()]),
                                  'confianca': confianca(caminho)}, ensure_ascii=False))
                return
            falha('o tesseract não achou texto na imagem')
        except Exception as e:
            falha('tesseract falhou: ' + str(e)[:160])

    # rota opcional (só se alguém instalar): rapidocr roda offline também
    try:
        from rapidocr_onnxruntime import RapidOCR  # noqa
        res, _ = RapidOCR()(caminho)
        texto = ' '.join(linha[1] for linha in (res or []))
        if len(texto.strip()) >= 3:
            print(json.dumps({'ok': True, 'motor': 'rapidocr', 'texto': texto.strip()[:3000],
                              'linhas': len(res or []), 'confianca': None}, ensure_ascii=False))
            return
    except Exception:
        pass

    falha('sem motor de OCR local instalado (tesseract)')


main()
