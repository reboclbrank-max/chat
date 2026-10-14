#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 🎧 OUVIDO DA CASA v2 (14/10/2026) — transcreve áudio recebido por e-mail.
# Motor 1: Whisper (modelo 'base' do whisper.cpp via pywhispercpp) — com DICA dos nomes da casa,
#          que conserta "reboque" → "Rebocl" (testado).
# Motor 2 (reserva): Vosk pequeno pt-BR, offline.
# Uso: python3 tools/transcreve.py /caminho/audio.ext   → JSON {"texto": "...", "motor": "..."}.
import json
import os
import shutil
import subprocess
import sys

MODELO_VOSK = os.environ.get('VOSK_MODELO', '/tmp/vosk-model-small-pt-0.3')
DICA = 'Casa Rebocl Brank, dona Rebocl, horta, almoço, feira, portão.'
WAV = '/tmp/ouvido-casa-16k.wav'


def falha(msg):
    print(json.dumps({'texto': '', 'motor': '', 'erro': str(msg)[:200]}))
    sys.exit(0)


def para_16k(caminho):
    """Devolve o áudio como numpy float32 a 16 kHz (o formato que os dois motores querem)."""
    import numpy as np
    import soundfile as sf
    dados, taxa = None, 16000
    if shutil.which('ffmpeg'):
        try:
            r = subprocess.run(
                ['ffmpeg', '-y', '-loglevel', 'quiet', '-i', caminho, '-ar', '16000', '-ac', '1', WAV],
                capture_output=True, timeout=180)
            if r.returncode == 0 and os.path.exists(WAV):
                dados, taxa = sf.read(WAV, dtype='float32')
        except Exception:
            dados = None
    if dados is None:
        try:
            dados, taxa = sf.read(caminho, dtype='float32')
        except Exception as e:
            falha('não abri o áudio: ' + str(e))
    if dados is None or len(dados) < 4000:
        falha('áudio curto demais')
    if getattr(dados, 'ndim', 1) > 1:
        dados = dados.mean(axis=1)
    if taxa != 16000:
        n = int(len(dados) * 16000 / taxa)
        dados = np.interp(np.linspace(0, len(dados), n, endpoint=False), np.arange(len(dados)), dados)
    return dados.astype('float32')


def com_whisper(dados, modelo):
    try:
        from pywhispercpp.model import Model
        m = Model(modelo, n_threads=max(2, (os.cpu_count() or 2) - 1), print_realtime=False,
                  print_progress=False, language='pt')
        segs = m.transcribe(dados, initial_prompt=DICA)
        return ' '.join(s.text for s in segs).strip()
    except Exception:
        return ''


def com_vosk(dados):
    try:
        import numpy as np
        from vosk import Model, KaldiRecognizer, SetLogLevel
        if not os.path.isdir(MODELO_VOSK):
            return ''
        SetLogLevel(-1)
        m = Model(MODELO_VOSK)
        rec = KaldiRecognizer(m, 16000)
        rec.SetWords(False)
        pcm = (dados * 32767).astype(np.int16).tobytes()
        passo = 32000
        for i in range(0, len(pcm), passo):
            rec.AcceptWaveform(pcm[i:i + passo])
        return json.loads(rec.FinalResult()).get('text', '').strip()
    except Exception:
        return ''


def main():
    if len(sys.argv) < 2 or not os.path.exists(sys.argv[1]):
        falha('sem arquivo de áudio')
    dados = para_16k(sys.argv[1])

    # modelo 'small' (14/10: "Regue a horta amanhã cedo" certo, onde o 'base' errava);
    # reservas: 'base' (mais rápido) e o Vosk (leve, offline).
    texto, motor = com_whisper(dados, 'small'), 'whisper-small'
    if len(texto) < 2:
        texto, motor = com_whisper(dados, 'base'), 'whisper-base'
    if len(texto) < 2:
        texto, motor = com_vosk(dados), 'vosk'
    if len(texto) < 2:
        motor = ''
    print(json.dumps({'texto': texto, 'motor': motor}))


main()
