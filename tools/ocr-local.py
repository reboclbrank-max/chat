#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 🔤 OCR LOCAL DA CASA — lê texto de imagem sem internet nem terceiros.
# Tesseract recebe a imagem original e, se a leitura falhar ou ficar incerta, cópias locais em cinza/alto contraste.
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from shutil import which


def inteiro_env(nome, padrao, minimo, maximo):
    try:
        valor = int(os.environ.get(nome, str(padrao)))
    except (TypeError, ValueError):
        valor = padrao
    return max(minimo, min(maximo, valor))


# Um anexo não pode prender a fila do e-mail por vários minutos só no OCR local.
ORCAMENTO_SEG = inteiro_env('REBOCL_OCR_ORCAMENTO_SEG', 55, 5, 90)
TENTATIVA_SEG = inteiro_env('REBOCL_OCR_TENTATIVA_SEG', 25, 1, 45)
CONFIANCA_RAPIDA = 60.0


def falha(msg):
    print(json.dumps({'ok': False, 'motivo': msg}, ensure_ascii=False))
    sys.exit(0)


def tempo_restante(limite):
    restante = limite - time.monotonic()
    if restante <= 0:
        raise TimeoutError('orçamento local de OCR esgotado')
    # subprocess.run aceita float; deixar pequena folga evita iniciar chamada sem tempo útil.
    return max(0.2, min(float(TENTATIVA_SEG), restante))


def tesseract(caminho, extra, limite):
    langs = ['por+eng', 'por', 'eng']
    ultima = ''
    for lang in langs:
        r = subprocess.run(['tesseract', caminho, 'stdout', '-l', lang] + extra,
                           capture_output=True, text=True, timeout=tempo_restante(limite))
        if r.returncode == 0:
            return r.stdout or ''
        ultima = (r.stderr or '')[-160:]
    raise RuntimeError(ultima or 'tesseract não respondeu')


def confianca(caminho, psm, limite):
    try:
        t = tesseract(caminho, ['--psm', str(psm), 'tsv'], limite)
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
    # Confiança do motor é sinal principal, mas uma saída com palavras legíveis vale mais que
    # símbolos isolados com confiança marginalmente maior. Isso é critério genérico, não gabarito.
    texto = texto or ''
    uteis = len(re.findall(r'[0-9A-Za-zÀ-ÿ]', texto))
    palavras = len(re.findall(r'[A-Za-zÀ-ÿ]{3,}', texto))
    numeros = len(re.findall(r'\d', texto))
    return (float(conf) if conf is not None else 0) * 10 + min(uteis, 180) + min(palavras, 20) * 45 + min(numeros, 30)


def candidatos(caminho, limite):
    # Primeiro caminho barato: não cria cópia quando o Tesseract já lê o original com confiança útil.
    texto = limpa(tesseract(caminho, ['--psm', '3'], limite))
    conf = confianca(caminho, 3, limite) if len(texto) >= 3 else None
    if len(texto) >= 3:
        yield texto, conf, 'original'
        if conf is not None and conf >= CONFIANCA_RAPIDA:
            return

    # Texto curto, incerto ou JPEG regravado pode perder contraste em letras pequenas.
    # Tudo abaixo é efêmero e local; o teto global continua valendo para todas as variantes juntas.
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
                if tempo_restante(limite) < 1:
                    return
                arquivo = os.path.join(pasta, nome + '.png')
                variante.save(arquivo, 'PNG', optimize=True)
                for psm in (6, 11):
                    try:
                        texto = limpa(tesseract(arquivo, ['--psm', str(psm)], limite))
                        if len(texto) >= 3:
                            yield texto, confianca(arquivo, psm, limite), nome + '/psm' + str(psm)
                    except Exception:
                        if limite - time.monotonic() <= 0:
                            return


def main():
    if len(sys.argv) < 2:
        falha('sem imagem')
    caminho = sys.argv[1]
    if not os.path.exists(caminho):
        falha('a imagem não está aqui: ' + caminho)

    if which('tesseract'):
        limite = time.monotonic() + ORCAMENTO_SEG
        try:
            opcoes = list(candidatos(caminho, limite))
            if opcoes:
                texto, conf, variante = max(opcoes, key=lambda x: pontua(x[0], x[1]))
                print(json.dumps({'ok': True, 'motor': 'tesseract', 'texto': texto[:3000],
                                  'linhas': max(1, len(texto.splitlines())), 'confianca': conf,
                                  'variante': variante}, ensure_ascii=False))
                return
            falha('o tesseract não achou texto na imagem')
        except TimeoutError:
            falha('orçamento local de OCR esgotado')
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
