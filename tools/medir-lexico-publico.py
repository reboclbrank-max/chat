#!/usr/bin/env python3
"""MEDIDOR DO CAMINHO LEXICAL (rodada 136, 31/10/2026).

A fila do auto-diagnóstico vinha dizendo: "para o verbal, vale só base de fatos estáveis com
fonte, ou o modelo". Antes de aceitar isso como trabalho pendente, a rota foi MEDIDA: baixa a
única base lexical pública gratuita em português (OpenWordnet-PT), monta sinônimos (synset
compartilhado), antônimos, hiperônimos e merônimos, e testa os 5 casos verbais do gabarito.

Resultado em 31/10/2026: 0 de 5 (ver bench/lexico-publico.json). O arquivo baixado NÃO entra no
repositório (121 MB); este script existe para o número poder ser refeito por qualquer um.

Uso:  python3 tools/medir-lexico-publico.py [--json]
"""
import json
import os
import re
import sys
import tarfile
import tempfile
import unicodedata
import urllib.request

URL = 'https://github.com/own-pt/openWordnet-PT/archive/refs/heads/master.tar.gz'
CASOS = [
    ('facil-ver1', 'analogia profissional→local', ('medico', 'hospital', 'PROFISSAO_LOCAL')),
    ('facil-ver2', 'qual não pertence (categoria)', ('geladeira', None, 'CATEGORIA')),
    ('facil-ver3', 'sinônimo (efêmero → passageiro)', ('efemero', 'passageiro', 'SINONIMO')),
    ('facil-ver4', 'antônimo (escasso → abundante)', ('escasso', 'abundante', 'ANTONIMO')),
    ('dificil-d9', 'analogia todo→parte', ('livro', 'capitulo', 'TODO_PARTE')),
]


def normal(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower()


def baixar():
    destino = os.path.join(tempfile.gettempdir(), 'own-pt.tar.gz')
    if not os.path.exists(destino):
        print('baixando OpenWordnet-PT (~121 MB)...', file=sys.stderr)
        urllib.request.urlretrieve(URL, destino)
    pasta = tempfile.mkdtemp(prefix='ownpt-')
    with tarfile.open(destino) as t:
        membros = [m for m in t.getmembers() if m.name.endswith(('-wordsenses.ttl', '-relations.ttl'))]
        t.extractall(pasta, members=membros)
    return pasta


def carregar(pasta):
    ws2syn, s2l, l2s, rel = {}, {}, {}, {}
    for raiz, _, arquivos in os.walk(pasta):
        for nome in arquivos:
            caminho = os.path.join(raiz, nome)
            if nome.endswith('-wordsenses.ttl'):
                for linha in open(caminho, encoding='utf-8'):
                    m = re.match(r'own-pt:(synset-\S+) owns:containsWordSense own-pt:(wordsense-\S+)\s*[,.]', linha)
                    if m:
                        ws2syn[m.group(2)] = m.group(1).replace('synset-', '')
                atual = None
                for linha in open(caminho, encoding='utf-8'):
                    m = re.match(r'own-pt:(wordsense-\S+) a owns:WordSense', linha)
                    if m:
                        atual = m.group(1)
                        continue
                    m = re.search(r'rdfs:label "([^"]+)"@pt', linha)
                    if m and atual:
                        syn = ws2syn.get(atual)
                        if syn:
                            lema = normal(m.group(1))
                            s2l.setdefault(syn, set()).add(lema)
                            l2s.setdefault(lema, set()).add(syn)
                        atual = None
            elif nome.endswith('-relations.ttl'):
                for linha in open(caminho, encoding='utf-8'):
                    m = re.match(r'own-pt:synset-([0-9]+-[a-z]) owns:(\w+) own-pt:synset-([0-9]+-[a-z])', linha)
                    if m:
                        rel.setdefault(m.group(1), {}).setdefault(m.group(2), set()).add(m.group(3))
    return s2l, l2s, rel


def medir(s2l, l2s, rel):
    def syns(w):
        return l2s.get(w, set())

    resultados = []
    for ident, tipo, (a, b, relacao) in CASOS:
        coberto = False
        if relacao == 'SINONIMO':
            coberto = bool(syns(a) & syns(b))
        elif relacao == 'TODO_PARTE':
            coberto = any(b in s2l.get(x, set()) for s in syns(a)
                          for x in rel.get(s, {}).get('partMeronymOf', set()))
        elif relacao == 'PROFISSAO_LOCAL':
            coberto = bool(syns(a) & syns(b)) or any(
                b in s2l.get(x, set()) for s in syns(a) for x in rel.get(s, {}).get('hypernymOf', set()))
        elif relacao == 'ANTONIMO':
            alvos = set()
            for s in syns(a):
                for x in rel.get(s, {}).get('antonymOf', set()):
                    alvos |= s2l.get(x, set())
            coberto = b in alvos
        elif relacao == 'CATEGORIA':
            coberto = bool(syns(a))          # sem o synset da palavra não há categoria para comparar
        resultados.append({'id': ident, 'tipo': tipo, 'coberto': coberto})
    return resultados


def main():
    pasta = baixar()
    s2l, l2s, rel = carregar(pasta)
    resultados = medir(s2l, l2s, rel)
    saida = {
        'fonte': 'OpenWordnet-PT', 'url': URL,
        'lemas_pt': len(l2s), 'synsets': len(s2l),
        'relacoes': sum(len(v) for v in rel.values()),
        'casos': resultados,
        'cobertos': sum(1 for r in resultados if r['coberto']),
        'total': len(resultados),
    }
    if '--json' in sys.argv:
        print(json.dumps(saida, ensure_ascii=False, indent=1))
    else:
        print('lemas %d · synsets %d · relações %d' % (saida['lemas_pt'], saida['synsets'], saida['relacoes']))
        for r in resultados:
            print(('COBRE ' if r['coberto'] else 'NÃO COBRE ') + r['id'] + ' · ' + r['tipo'])
        print('cobertura: %d/%d' % (saida['cobertos'], saida['total']))


if __name__ == '__main__':
    main()
