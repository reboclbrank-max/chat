#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 🎧 OUVIDO DA CASA (14/10/2026) — transcreve um áudio recebido por e-mail.
# Grátis e offline: modelo pequeno pt-BR do Vosk (o chat baixa uma vez por turno, 31 MB).
# Uso: python3 tools/transcreve.py /caminho/audio.ext   → imprime {"texto": "..."} em JSON.
import json
import os
import shutil
import subprocess
import sys

MODELO = os.environ.get('VOSK_MODELO', '/tmp/vosk-model-small-pt-0.3')
WAV = '/tmp/ouvido-casa-16k.wav'


def falha(msg):
    print(json.dumps({'texto': '', 'erro': str(msg)[:200]}))
    sys.exit(0)


def main():
    if len(sys.argv) < 2 or not os.path.exists(sys.argv[1]):
        falha('sem arquivo de áudio')
    if not os.path.isdir(MODELO):
        falha('modelo de escuta ausente')
    try:
        import numpy as np
        import soundfile as sf
        from vosk import Model, KaldiRecognizer, SetLogLevel
    except Exception as e:
        falha('bibliotecas: ' + str(e))

    dados = None
    taxa = 16000
    # 1) ffmpeg primeiro: entende m4a do iPhone, opus do WhatsApp, o que vier
    if shutil.which('ffmpeg'):
        try:
            r = subprocess.run(
                ['ffmpeg', '-y', '-loglevel', 'quiet', '-i', sys.argv[1], '-ar', '16000', '-ac', '1', WAV],
                capture_output=True, timeout=180)
            if r.returncode == 0 and os.path.exists(WAV):
                dados, taxa = sf.read(WAV, dtype='float32')
        except Exception:
            dados = None
    # 2) sem ffmpeg: tenta direto (mp3/ogg/wav/flac — o que a libsndfile abrir)
    if dados is None:
        try:
            dados, taxa = sf.read(sys.argv[1], dtype='float32')
        except Exception as e:
            falha('não abri o áudio: ' + str(e))

    if dados is None or len(dados) < 4000:
        falha('áudio curto demais')
    if getattr(dados, 'ndim', 1) > 1:
        dados = dados.mean(axis=1)
    if taxa != 16000:
        n = int(len(dados) * 16000 / taxa)
        dados = np.interp(np.linspace(0, len(dados), n, endpoint=False), np.arange(len(dados)), dados)
    pcm = (dados * 32767).astype(np.int16).tobytes()

    SetLogLevel(-1)
    try:
        modelo = Model(MODELO)
        rec = KaldiRecognizer(modelo, 16000)
        rec.SetWords(False)
        passo = 32000
        for i in range(0, len(pcm), passo):
            rec.AcceptWaveform(pcm[i:i + passo])
        texto = json.loads(rec.FinalResult()).get('text', '')
        print(json.dumps({'texto': texto.strip()}))
    except Exception as e:
        falha('transcrição: ' + str(e))


main()
