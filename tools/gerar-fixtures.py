#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 🧪 FOTOS DE PROVA geradas na hora (não vão para o repositório): o robô de teste usa
#   foto-grande.jpg  — a horta como foto de celular de verdade: 12 MP, ~6 MB, gravada deitada com a marca EXIF 6
#                      (antes da v12.14, foto acima de ~4 MB era descartada sem aviso)
#   foto-iphone.heic — a horta em HEIC, o formato padrão do iPhone
import os
import sys

from PIL import Image

base = os.path.dirname(os.path.abspath(__file__))
horta = Image.open(os.path.join(base, 'foto-horta.jpg')).convert('RGB')
grande = horta.resize((4032, 2196), Image.LANCZOS)
ruido = Image.effect_noise((4032, 2196), 64).convert('RGB')       # grão de câmera: deixa o JPEG do tamanho real
grande = Image.blend(grande, ruido, 0.12)
deitada = grande.rotate(90, expand=True)                          # gravada deitada…
exif = Image.Exif()
exif[0x0112] = 6                                                  # …com a marca que manda girar 90° (como o celular)
destino = os.path.join(base, 'foto-grande.jpg')
deitada.save(destino, 'JPEG', quality=97, subsampling=0, exif=exif.tobytes())
print('✔ foto-grande.jpg  %dx%d · %.1f MB · EXIF 6' % (deitada.size[0], deitada.size[1], os.path.getsize(destino) / 1e6))
try:
    import pillow_heif
    destino = os.path.join(base, 'foto-iphone.heic')
    pillow_heif.from_pillow(horta).save(destino, quality=80)
    print('✔ foto-iphone.heic %dx%d · %.0f KB' % (horta.size[0], horta.size[1], os.path.getsize(destino) / 1024))
except Exception as e:
    print('⚠️ foto-iphone.heic não gerada (%s)' % str(e)[:80])
    sys.exit(0)
