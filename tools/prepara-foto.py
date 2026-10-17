#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 📐 PREPARA A FOTO v3 (17/10/2026) — foto de celular (12 MP, 3–8 MB, às vezes gravada "deitada" com a marca EXIF
# que manda girar) vira JPEG EM PÉ com até 2048 px no lado maior, ANTES de tudo. Toda imagem é regravada em JPEG
# novo: orientação é aplicada e EXIF/metadados (inclusive localização) não seguem para visão/OCR externos.
# A visão local, o leitor de texto e o olho recebem a mesma cópia higienizada; formatos que o Pillow lê viram JPEG.
# v2: abre HEIC/HEIF (formato do iPhone) quando o pillow-heif está instalado; --grade junta até 4 fotos numa
#     MONTAGEM NUMERADA (1, 2, 3, 4 no canto de cada uma), para e-mail com várias fotos.
# Uso: python3 tools/prepara-foto.py entrada saida.jpg [--lado 2048]          → JSON {"ok", "mudou", "info"}
#      python3 tools/prepara-foto.py --grade saida.jpg foto1 foto2 [foto3 foto4] → JSON {"ok", "info"}
import json
import os
import sys

try:   # HEIC/HEIF do iPhone (opcional: sem o pillow-heif, a foto HEIC devolve ok=false e o chat avisa o dono)
    import pillow_heif
    pillow_heif.register_heif_opener()
    HEIC = True
except Exception:
    HEIC = False


def sai(d):
    print(json.dumps(d, ensure_ascii=False))
    sys.exit(0)


def em_pe_rgb(im):
    from PIL import Image, ImageOps
    im2 = ImageOps.exif_transpose(im)
    if im2.mode in ('RGBA', 'LA', 'P'):
        im2 = im2.convert('RGBA')
        fundo = Image.new('RGB', im2.size, (255, 255, 255))
        fundo.paste(im2, mask=im2.split()[-1])
        return fundo
    return im2.convert('RGB')


def fonte(tamanho):
    from PIL import ImageFont
    try:
        return ImageFont.load_default(size=tamanho)          # Pillow >= 10.1
    except Exception:
        pass
    for caminho in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'):
        try:
            return ImageFont.truetype(caminho, tamanho)
        except Exception:
            pass
    return ImageFont.load_default()


def grade(saida, entradas):
    from PIL import Image, ImageDraw
    fotos = []
    for e in entradas[:4]:
        try:
            with Image.open(e) as im:
                fotos.append(em_pe_rgb(im))
        except Exception as erro:
            fotos.append(None)
            print('foto %s não abriu: %s' % (os.path.basename(e), str(erro)[:80]), file=sys.stderr)
    validas = [f for f in fotos if f is not None]
    if len(validas) < 2:
        sai({'ok': False, 'motivo': 'menos de 2 fotos abriram (%d de %d)' % (len(validas), len(entradas))})
    n = len(fotos)
    colunas, linhas = (2, 1) if n == 2 else (2, 2)
    cel = 1024
    tela = Image.new('RGB', (colunas * cel, linhas * cel), (236, 236, 236))
    desenho = ImageDraw.Draw(tela)
    f_num = fonte(96)
    for i, f in enumerate(fotos):
        x0, y0 = (i % colunas) * cel, (i // colunas) * cel
        if f is not None:
            g = f.copy()
            g.thumbnail((cel - 16, cel - 16), Image.LANCZOS)
            tela.paste(g, (x0 + (cel - g.size[0]) // 2, y0 + (cel - g.size[1]) // 2))
        else:
            desenho.text((x0 + 200, y0 + cel // 2), 'foto não abriu', fill=(90, 90, 90), font=fonte(48))
        # número grande no canto: círculo branco com borda preta
        cx, cy, r = x0 + 78, y0 + 78, 62
        desenho.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255), outline=(0, 0, 0), width=6)
        txt = str(i + 1)
        try:
            caixa = desenho.textbbox((0, 0), txt, font=f_num)
            lw, lh = caixa[2] - caixa[0], caixa[3] - caixa[1]
            desenho.text((cx - lw / 2 - caixa[0], cy - lh / 2 - caixa[1]), txt, fill=(0, 0, 0), font=f_num)
        except Exception:
            desenho.text((cx - 20, cy - 30), txt, fill=(0, 0, 0), font=f_num)
    # linhas finas separando as fotos
    for c in range(1, colunas):
        desenho.line((c * cel, 0, c * cel, linhas * cel), fill=(255, 255, 255), width=6)
    for l in range(1, linhas):
        desenho.line((0, l * cel, colunas * cel, l * cel), fill=(255, 255, 255), width=6)
    tela.save(saida, 'JPEG', quality=88, optimize=True)
    sai({'ok': True, 'mudou': True, 'info': 'montagem de %d fotos (%d×%d) → %dx%d JPEG %.0f KB%s' % (
        n, colunas, linhas, tela.size[0], tela.size[1], os.path.getsize(saida) / 1024,
        '' if len(validas) == n else ' · %d não abriu' % (n - len(validas)))})


def main():
    a = sys.argv[1:]
    try:
        from PIL import Image
    except Exception:
        sai({'ok': False, 'motivo': 'sem Pillow'})
    if a and a[0] == '--grade':
        if len(a) < 4:
            sai({'ok': False, 'motivo': 'uso: --grade saida.jpg foto1 foto2 [foto3 foto4]'})
        grade(a[1], a[2:])
    lado = 2048
    if '--lado' in a:
        i = a.index('--lado')
        lado = int(a[i + 1])
        del a[i:i + 2]
    if len(a) < 2:
        sai({'ok': False, 'motivo': 'uso: prepara-foto.py entrada saida.jpg'})
    ent, saida = a[0], a[1]
    try:
        tamanho = os.path.getsize(ent)
        with Image.open(ent) as im:
            w0, h0 = im.size
            fmt = im.format or '?'
            try:
                orient = int(im.getexif().get(0x0112, 1) or 1)
            except Exception:
                orient = 1
            # Mesmo uma foto pequena e já em pé é regravada: não reutilizamos EXIF,
            # ICC/thumbnail ou outros metadados do arquivo original em envio externo.
            im2 = em_pe_rgb(im)
            if max(im2.size) > lado:
                im2.thumbnail((lado, lado), Image.LANCZOS)
            im2.save(saida, 'JPEG', quality=88, optimize=True)
        partes = ['%dx%d %s %.1f MB → %dx%d JPEG %.0f KB' % (w0, h0, fmt, tamanho / 1e6, im2.size[0], im2.size[1], os.path.getsize(saida) / 1024)]
        if orient != 1:
            partes.append('desvirada (EXIF %d)' % orient)
        sai({'ok': True, 'mudou': True, 'info': ' · '.join(partes)})
    except Exception as e:
        sai({'ok': False, 'motivo': ('HEIC sem conversor instalado' if (not HEIC and ent and open(ent, 'rb').read(32).find(b'ftyphei') >= 0) else str(e)[:160])})


main()
