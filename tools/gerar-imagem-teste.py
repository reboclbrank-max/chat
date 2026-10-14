# -*- coding: utf-8 -*-
# 🖼️ GERA A IMAGEM DO TESTE DE VISÃO — com MEDIDA (lição de 14/10/2026: duas imagens seguidas
# saíram com defeito — uma cortava a data, outra cortava o "L" de REBOCL, e a culpa parecia do modelo).
# Esta versão mede o texto com textbbox, garante margem e AUTOVERIFICA — o teste de visão só é justo
# se a própria imagem estiver correta.
from PIL import Image, ImageDraw, ImageFont

W, H = 900, 500
img = Image.new('RGB', (W, H), 'white')
d = ImageDraw.Draw(img)


def fonte(px):
    for caminho in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf']:
        try:
            return ImageFont.truetype(caminho, px)
        except Exception:
            pass
    return ImageFont.load_default()


f1, f2 = fonte(64), fonte(56)
t1, t2 = 'CASA REBOCL', '14/10/2026'

# formas à esquerda
d.rectangle([40, 60, 200, 220], fill=(0, 90, 200))                    # quadrado azul
d.ellipse([250, 60, 410, 220], fill=(220, 30, 30))                    # círculo vermelho
d.polygon([(480, 220), (560, 60), (640, 220)], fill=(20, 160, 70))    # triângulo verde

# texto à direita, MEDIDO e encostado com 30px de respiro na borda
b1 = d.textbbox((0, 0), t1, font=f1)
b2 = d.textbbox((0, 0), t2, font=f2)
x1 = W - 30 - (b1[2] - b1[0])
x2 = W - 30 - (b2[2] - b2[0])
d.text((x1 - b1[0], 190 - b1[1]), t1, fill='black', font=f1)
d.text((x2 - b2[0], 300 - b2[1]), t2, fill='black', font=f2)
img.save('teste-visao3.png')

# AUTOVERIFICAÇÃO: nenhum pixel preto perto da borda
px = img.load()
xs, ys = [], []
for y in range(H):
    for x in range(W):
        if sum(px[x, y]) < 200:
            xs.append(x)
            ys.append(y)
margem = min(min(xs), W - 1 - max(xs), min(ys), H - 1 - max(ys))
print('pixels pretos:', len(xs), '· bbox x', min(xs), '-', max(xs), '· y', min(ys), '-', max(ys))
print('margem mínima até a borda:', margem, 'px')
assert margem >= 20, 'texto perto demais da borda — o teste de visão ficaria injusto'
print('✅ imagem ok: teste-visao3.png')
