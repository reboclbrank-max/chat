#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 📐 PREPARA A FOTO v1 (15/10/2026) — foto de celular (12 MP, 3–5 MB, às vezes gravada "deitada" com a marca EXIF
# que manda girar) vira JPEG EM PÉ com até 2048 px no lado maior, ANTES de tudo: a internet recebe um arquivo
# pequeno (serviço gratuito recusa anexo grande) e a visão local, o leitor de texto e o olho veem a foto em pé.
# Foto pequena, em pé e em JPEG/PNG passa direto (nada muda). Formato que o Pillow lê (WEBP etc.) vira JPEG.
# Uso: python3 tools/prepara-foto.py entrada saida.jpg [--lado 2048]  → JSON {"ok", "mudou", "info"}
import json
import os
import sys


def sai(d):
    print(json.dumps(d, ensure_ascii=False))
    sys.exit(0)


def main():
    a = sys.argv[1:]
    lado = 2048
    if '--lado' in a:
        i = a.index('--lado')
        lado = int(a[i + 1])
        del a[i:i + 2]
    if len(a) < 2:
        sai({'ok': False, 'motivo': 'uso: prepara-foto.py entrada saida.jpg'})
    ent, saida = a[0], a[1]
    try:
        from PIL import Image, ImageOps
    except Exception:
        sai({'ok': False, 'motivo': 'sem Pillow'})
    try:
        tamanho = os.path.getsize(ent)
        with Image.open(ent) as im:
            w0, h0 = im.size
            fmt = im.format or '?'
            try:
                orient = int(im.getexif().get(0x0112, 1) or 1)
            except Exception:
                orient = 1
            if max(w0, h0) <= lado and orient == 1 and fmt in ('JPEG', 'PNG') and tamanho <= 1500000:
                sai({'ok': True, 'mudou': False, 'info': '%dx%d %s (já estava boa)' % (w0, h0, fmt)})
            im2 = ImageOps.exif_transpose(im)
            if max(im2.size) > lado:
                im2.thumbnail((lado, lado), Image.LANCZOS)
            if im2.mode in ('RGBA', 'LA', 'P'):
                im2 = im2.convert('RGBA')
                fundo = Image.new('RGB', im2.size, (255, 255, 255))
                fundo.paste(im2, mask=im2.split()[-1])
                im2 = fundo
            else:
                im2 = im2.convert('RGB')
            im2.save(saida, 'JPEG', quality=88, optimize=True)
        partes = ['%dx%d %s %.1f MB → %dx%d JPEG %.0f KB' % (w0, h0, fmt, tamanho / 1e6, im2.size[0], im2.size[1], os.path.getsize(saida) / 1024)]
        if orient != 1:
            partes.append('desvirada (EXIF %d)' % orient)
        sai({'ok': True, 'mudou': True, 'info': ' · '.join(partes)})
    except Exception as e:
        sai({'ok': False, 'motivo': str(e)[:160]})


main()
