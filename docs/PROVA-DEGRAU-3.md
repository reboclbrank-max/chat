# Prova do degrau 3 (05/11/2026)

Este arquivo existe por um motivo só: **ser mesclado pelo próprio mesclador**.

Ele é texto, está em `docs/`, e a barreira de testes roda nele como em qualquer PR.
Se ele aparecer na `main` sem ninguém clicar em "merge", o degrau 3 está provado em
produção — e não apenas nos contratos offline.

## O que a prova demonstra

1. o workflow `mesclador.yml` acordou sozinho ao fim da barreira;
2. ele leu a lista de arquivos da PR e reconheceu a faixa (`docs/`);
3. mesclou com squash, marcando o commit com `[mesclador]` — a marca que permite
   a reversão automática se a `main` ficar vermelha depois.

## O que ela não demonstra

Que a reversão funciona. Reverter exige que a `main` fique vermelha por causa de um
merge do mesclador, e provocar isso de propósito seria sujar a `main` só para testar.
A reversão fica provada em contrato (`tools/testes/mesclador-estreito.js`) e será
exercitada de verdade no primeiro caso real.
