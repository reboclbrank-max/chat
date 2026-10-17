#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 🔤 OCR LOCAL DA CASA — lê texto de imagem sem internet nem terceiros.
# Tesseract recebe a imagem original e, se a leitura falhar, cópias locais em cinza/alto contraste.
import json
import os
import re
import subprocess
import sys
import tempfile
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


def confianca(caminho, psm):
    try:
        t = tesseract(caminho, ['--psm', str(psm), 'tsv'])
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


def limpa(texto):
    return ' '.join((texto or '').split())


def pontua(texto, conf):
    # Confiança do motor é sinal principal; caracteres alfanuméricos evitam escolher saída vazia.
    uteis = len(re.findall(r'[0-9A-Za-zÀ-ÿ]', texto or ''))
    return (float(conf) if conf is not None else 0) * 10 + min(uteis, 180)


def candidatos(caminho):
    # Primeiro caminho barato: não cria cópia quando o Tesseract já lê a imagem original.
    texto = limpa(tesseract(caminho, ['--psm', '3']))
    if len(texto) >= 3:
        yield texto, confianca(caminho, 3), 'original'
        return

    # Fotos/JPEG regravados podem perder contraste em letras pequenas. Tudo abaixo é efêmero e local.
    try:
        from PIL import Image, ImageOps, ImageEnhance
    except Exception:
        return
    with tempfile.TemporaryDirectory(prefix='rebocl-ocr-') as pasta:
        with Image.open(caminho) as im:
            im = ImageOps.exif_transpose(im).convert('L')
            if max(im.size) < 2200:
                escala = min(3, max(1, 2200 // max(im.size)))
                if escala > 1:
                    im = im.resize((im.width * escala, im.height * escala), Image.Resampling.LANCZOS)
            auto = ImageOps.autocontrast(im, cutoff=1)
            contraste = ImageEnhance.Contrast(auto).enhance(1.8)
            limiar = contraste.point(lambda x: 255 if x > 165 else 0)
            variantes = [('auto', auto), ('contraste', contraste), ('limiar', limiar)]
            for nome, variante in variantes:
                arquivo = os.path.join(pasta, nome + '.png')
                variante.save(arquivo, 'PNG', optimize=True)
                for psm in (6, 11):
                    try:
                        texto = limpa(tesseract(arquivo, ['--psm', str(psm)]))
                        if len(texto) >= 3:
                            yield texto, confianca(arquivo, psm), nome + '/psm' + str(psm)
                    except Exception:
                        pass


def main():
    if len(sys.argv) < 2:
        falha('sem imagem')
    caminho = sys.argv[1]
    if not os.path.exists(caminho):
        falha('a imagem não está aqui: ' + caminho)

    if which('tesseract'):
        try:
            opcoes = list(candidatos(caminho))
            if opcoes:
                texto, conf, variante = max(opcoes, key=lambda x: pontua(x[0], x[1]))
                print(json.dumps({'ok': True, 'motor': 'tesseract', 'texto': texto[:3000],
                                  'linhas': max(1, len(texto.splitlines())), 'confianca': conf,
                                  'variante': variante}, ensure_ascii=False))
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
