#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 🧪 FOTOS DE PROVA geradas na hora (não vão para o repositório): o robô de teste usa
#   foto-grande.jpg  — a horta como foto de celular de verdade: 12 MP, ~6 MB, gravada deitada com a marca EXIF 6
#                      (antes da v12.14, foto acima de ~4 MB era descartada sem aviso)
#   foto-iphone.heic — a horta em HEIC, o formato padrão do iPhone
#   nota-de-voz.ogg  — nota de voz como o WhatsApp manda (voz sintetizada → opus); .mp3 se não houver ffmpeg
#   materiais.xlsx   — planilha Excel com materiais, quantidades e preços
#   pdf-escaneado.pdf — PDF de 2 páginas SÓ COM IMAGEM (sem texto), como um documento digitalizado
#   video-curto.mp4  — vídeo de 6 s (a horta, depois o bilhete) com uma fala: "a palavra do vídeo é jabuticaba"
import os
import subprocess
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
try:   # nota de voz: voz sintetizada → opus (.ogg), como o WhatsApp
    from gtts import gTTS
    mp3 = os.path.join(base, 'nota-de-voz.mp3')
    gTTS('Olá, casa Rebocl. Este é o teste de voz. A palavra secreta é mangueira. Quanto é dois mais três?', lang='pt', tld='com.br').save(mp3)
    ogg = os.path.join(base, 'nota-de-voz.ogg')
    try:
        convertido = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp3, '-c:a', 'libopus', '-b:a', '24k', ogg]).returncode == 0 and os.path.exists(ogg)
    except Exception:
        convertido = False   # sem ffmpeg: fica o .mp3
    if convertido:
        os.remove(mp3)
        print('✔ nota-de-voz.ogg  %.0f KB (opus)' % (os.path.getsize(ogg) / 1024))
    else:
        print('✔ nota-de-voz.mp3  (sem ffmpeg)')
except Exception as e:
    print('⚠️ nota de voz não gerada (%s)' % str(e)[:80])
try:   # planilha Excel
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'Materiais'
    for linha in [['Item', 'Quantidade', 'Preço (R$)'], ['Cimento 50 kg', 10, 38.9], ['Areia (m³)', 3, 120], ['Tijolo', 500, 0.85]]:
        ws.append(linha)
    wb.save(os.path.join(base, 'materiais.xlsx'))
    print('✔ materiais.xlsx')
except Exception as e:
    print('⚠️ planilha não gerada (%s)' % str(e)[:80])
try:   # PDF escaneado de 2 páginas (só imagem, sem camada de texto)
    from PIL import ImageDraw, ImageFont

    def pagina(linhas):
        im = Image.new('RGB', (1240, 1754), 'white')
        d = ImageDraw.Draw(im)
        try:
            f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 56)
        except Exception:
            f = ImageFont.load_default(size=56)
        y = 160
        for l in linhas:
            d.text((120, y), l, fill='black', font=f)
            y += 110
        return im
    p1 = pagina(['RELATÓRIO DA HORTA', 'Página 1', 'Canteiros: 6', 'Regas por semana: 3'])
    p2 = pagina(['RELATÓRIO DA HORTA', 'Página 2', 'A senha do portão é 4721', 'Responsável: Dona Marta'])
    p1.save(os.path.join(base, 'pdf-escaneado.pdf'), 'PDF', resolution=150, save_all=True, append_images=[p2])
    print('✔ pdf-escaneado.pdf (2 páginas, só imagem)')
except Exception as e:
    print('⚠️ PDF escaneado não gerado (%s)' % str(e)[:80])
try:   # vídeo curto: 2 cenas + fala (precisa de ffmpeg)
    from gtts import gTTS
    fala = os.path.join(base, 'fala-video.mp3')
    gTTS('Este é o vídeo de teste da casa. A palavra do vídeo é jabuticaba.', lang='pt', tld='com.br').save(fala)
    video = os.path.join(base, 'video-curto.mp4')
    filtro = ('[0:v]scale=1024:558,setsar=1[a];[1:v]scale=1024:558:force_original_aspect_ratio=decrease,'
              'pad=1024:558:(ow-iw)/2:(oh-ih)/2:white,setsar=1[b];[a][b]concat=n=2:v=1:a=0,format=yuv420p[v]')
    r = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-t', '3', '-i', os.path.join(base, 'foto-horta.jpg'),
                        '-loop', '1', '-t', '3', '-i', os.path.join(base, 'foto-bilhete.png'), '-i', fala,
                        '-filter_complex', filtro, '-map', '[v]', '-map', '2:a', '-c:v', 'libx264', '-preset', 'veryfast',
                        '-c:a', 'aac', '-t', '6', video])
    os.remove(fala)
    print('✔ video-curto.mp4  %.0f KB' % (os.path.getsize(video) / 1024) if r.returncode == 0 and os.path.exists(video) else '⚠️ vídeo não gerado (ffmpeg falhou)')
except Exception as e:
    print('⚠️ vídeo não gerado (%s)' % str(e)[:80])
