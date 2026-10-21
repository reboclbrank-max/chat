#!/usr/bin/env bash
# Exercita, em Chromium headless real, a lista, PWA, rascunho e Workspace local.
# A cópia da página, API, perfil, IndexedDB e capturas existem apenas em /tmp:
# não usa PAT, conversa, conta, rede externa ou perfil persistente.
set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$raiz"

if [ -n "${CHROMIUM_BIN:-}" ]; then
  navegador="$CHROMIUM_BIN"
elif command -v chromium-headless-shell >/dev/null 2>&1; then
  navegador="$(command -v chromium-headless-shell)"
elif command -v chromium >/dev/null 2>&1; then
  navegador="$(command -v chromium)"
elif command -v chromium-browser >/dev/null 2>&1; then
  navegador="$(command -v chromium-browser)"
elif command -v google-chrome >/dev/null 2>&1; then
  navegador="$(command -v google-chrome)"
else
  echo "SKIP: Chromium não está instalado. Em Debian/Ubuntu, use: sudo apt-get update -qq && sudo apt-get install -y -qq chromium-headless-shell" >&2
  exit 2
fi

for cmd in node python3 timeout; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "ERRO: falta $cmd" >&2; exit 2; }
done

porta="$(python3 - <<'PY'
import socket
s = socket.socket()
s.bind(('127.0.0.1', 0))
print(s.getsockname()[1])
s.close()
PY
)"
trabalho="$(mktemp -d /tmp/chat-browser-lista.XXXXXX)"
servidor_pid=""
limpar() {
  if [ -n "$servidor_pid" ] && kill -0 "$servidor_pid" 2>/dev/null; then
    kill "$servidor_pid" 2>/dev/null || true
    wait "$servidor_pid" 2>/dev/null || true
  fi
  rm -rf "$trabalho"
}
trap limpar EXIT

rotas=(index.html direto.html ligar.html limpar.html)
# A cópia precisa incluir a casca local que as quatro páginas realmente carregam.
# Sem isso, um erro em um módulo compartilhado poderia interromper a página antes
# da fixture testar a lista e daria uma falsa prova de navegador.
ativos_locais=(chat-estilos.css chat-pwa.js chat-comandos-locais.js chat-filtro-chips.js chat-organizacao-local.js chat-colecoes-local.js chat-workspace.js dna.json)
for rota in "${rotas[@]}"; do
  cp "$rota" "$trabalho/$rota"
done
for ativo in "${ativos_locais[@]}"; do
  cp "$ativo" "$trabalho/$ativo"
done
python3 - "$trabalho" "${rotas[@]}" <<'PY'
from pathlib import Path
import sys

pasta = Path(sys.argv[1])
paginas = [pasta / nome for nome in sys.argv[2:]]
preparo = """<script>
/* Fixture controlada: valor inerte, sem PAT, conversa ou API real. */
localStorage.setItem('assistente_rebocl_token', 'controle-local-sem-segredo');
try {
  // A fixture confirma os diálogos do ciclo local; não há dado real, download ou rede externa.
  window.confirm = () => true;
  window.__blobsBackupsLocais = [];
  const criarUrlControlada = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (blob) => {
    window.__blobsBackupsLocais.push(blob);
    return criarUrlControlada(blob);
  };
  if ('serviceWorker' in navigator) {
    const esperaControlada = { postMessage: (dado) => { document.documentElement.dataset.pwaUpdateRequest = String((dado || {}).tipo || ''); } };
    navigator.serviceWorker.register = () => Promise.resolve({ waiting: esperaControlada, installing: null, addEventListener: () => {}, update: () => {} });
  }
} catch (e) {}
</script>"""
teste_lista = """<script>
(async () => {
  const esperar = async (predicado, limite = 5000, etapa = 'etapa sem rótulo') => {
    const fim = Date.now() + limite;
    while (Date.now() < fim) {
      if (predicado()) return;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw new Error('tempo esgotado na fixture: ' + etapa);
  };
  const visivel = (elemento) => !!elemento && getComputedStyle(elemento).display !== 'none';
  const porTexto = (raiz, seletor, texto) => [...raiz.querySelectorAll(seletor)].find((item) => item.textContent.includes(texto));
  const porNomeArquivoExato = (nome) => [...document.querySelectorAll('#workspace-lista-arquivos .workspace-arquivo')].find((item) => {
    const titulo = item.querySelector('strong');
    return titulo && titulo.textContent === nome;
  });
  // Fixture controlada de uma gravação concorrente: altera somente o IndexedDB
  // efêmero do perfil de teste, sem guia/dado/servidor real nem rede externa.
  const atualizarArquivoWorkspaceControlado = (id, conteudo) => new Promise((resolve, reject) => {
    const abertura = indexedDB.open('rebocl-workspace-local-v1');
    abertura.onerror = () => reject(abertura.error || new Error('não abriu IndexedDB controlado'));
    abertura.onsuccess = () => {
      const banco = abertura.result;
      const transacao = banco.transaction('arquivos', 'readwrite');
      const loja = transacao.objectStore('arquivos');
      const leitura = loja.get(id);
      let atualizado = null;
      leitura.onsuccess = () => {
        if (!leitura.result) { transacao.abort(); return; }
        atualizado = Object.assign({}, leitura.result, {
          conteudo,
          bytes: new TextEncoder().encode(conteudo).length,
          versao: Number(leitura.result.versao || 1) + 1,
          atualizadoEm: new Date().toISOString()
        });
        loja.put(atualizado);
      };
      leitura.onerror = () => { try { transacao.abort(); } catch (_) {} };
      transacao.oncomplete = () => { banco.close(); atualizado ? resolve(atualizado) : reject(new Error('arquivo controlado ausente')); };
      transacao.onerror = () => { banco.close(); reject(transacao.error || new Error('falha na escrita concorrente controlada')); };
      transacao.onabort = () => { banco.close(); reject(transacao.error || new Error('escrita concorrente controlada cancelada')); };
    };
  });
  // Fixture controlada de um irmão criado por outra guia entre a edição e o
  // salvamento. Só altera o IndexedDB efêmero; não há conteúdo, perfil ou rede real.
  const adicionarArquivoWorkspaceControlado = (projetoId, nome, conteudo, idControlado = 'arquivo-concorrente-renomeacao') => new Promise((resolve, reject) => {
    const abertura = indexedDB.open('rebocl-workspace-local-v1');
    abertura.onerror = () => reject(abertura.error || new Error('não abriu IndexedDB para nome concorrente'));
    abertura.onsuccess = () => {
      const banco = abertura.result;
      const transacao = banco.transaction(['projetos', 'arquivos'], 'readwrite');
      const projetos = transacao.objectStore('projetos');
      const arquivos = transacao.objectStore('arquivos');
      const leituraProjeto = projetos.get(projetoId);
      let arquivo = null;
      let projeto = null;
      leituraProjeto.onsuccess = () => {
        if (!leituraProjeto.result || leituraProjeto.result.lixeiraEm) { try { transacao.abort(); } catch (_) {} return; }
        const quando = new Date().toISOString();
        projeto = Object.assign({}, leituraProjeto.result, { atualizadoEm: quando });
        arquivo = {
          id: idControlado, projetoId, nome, conteudo,
          bytes: new TextEncoder().encode(conteudo).length, versao: 1, criadoEm: quando, atualizadoEm: quando
        };
        arquivos.put(arquivo);
        projetos.put(projeto);
      };
      leituraProjeto.onerror = () => { try { transacao.abort(); } catch (_) {} };
      transacao.oncomplete = () => { banco.close(); arquivo ? resolve({ arquivo, projeto }) : reject(new Error('projeto controlado ausente para nome concorrente')); };
      transacao.onerror = () => { banco.close(); reject(transacao.error || new Error('falha ao criar irmão concorrente controlado')); };
      transacao.onabort = () => { banco.close(); reject(transacao.error || new Error('criação de irmão concorrente controlada cancelada')); };
    };
  });
  // Uma segunda escrita local controlada representa outra guia atualizada. Ela
  // usa apenas o IndexedDB efêmero da fixture, sem conversa, perfil ou rede real.
  const adicionarProjetoWorkspaceControlado = (nome) => new Promise((resolve, reject) => {
    const abertura = indexedDB.open('rebocl-workspace-local-v1');
    abertura.onerror = () => reject(abertura.error || new Error('não abriu IndexedDB para projeto concorrente'));
    abertura.onsuccess = () => {
      const banco = abertura.result;
      const transacao = banco.transaction('projetos', 'readwrite');
      const projeto = {
        id: 'projeto-concorrente-arquivo-completo', nome,
        criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString()
      };
      transacao.objectStore('projetos').put(projeto);
      transacao.oncomplete = () => { banco.close(); resolve(projeto); };
      transacao.onerror = () => { banco.close(); reject(transacao.error || new Error('falha ao criar projeto concorrente controlado')); };
      transacao.onabort = () => { banco.close(); reject(transacao.error || new Error('projeto concorrente controlado cancelado')); };
    };
  });
  // Fixture controlada de uma guia que acabou de levar um projeto vazio à
  // Lixeira. Ela só toca o IndexedDB temporário, para que criar/renomear na
  // tela antiga não possam reativar esse registro por acidente.
  const moverProjetoWorkspaceControlado = (id) => new Promise((resolve, reject) => {
    const abertura = indexedDB.open('rebocl-workspace-local-v1');
    abertura.onerror = () => reject(abertura.error || new Error('não abriu IndexedDB para estrutura concorrente'));
    abertura.onsuccess = () => {
      const banco = abertura.result;
      const transacao = banco.transaction('projetos', 'readwrite');
      const loja = transacao.objectStore('projetos');
      const leitura = loja.get(id);
      let projeto = null;
      leitura.onsuccess = () => {
        if (!leitura.result) { try { transacao.abort(); } catch (_) {} return; }
        const quando = new Date().toISOString();
        projeto = Object.assign({}, leitura.result, { lixeiraEm: quando, lixeiraRaiz: 'projeto', lixeiraProjetoId: id });
        loja.put(projeto);
      };
      leitura.onerror = () => { try { transacao.abort(); } catch (_) {} };
      transacao.oncomplete = () => { banco.close(); projeto ? resolve(projeto) : reject(new Error('projeto estrutural controlado ausente')); };
      transacao.onerror = () => { banco.close(); reject(transacao.error || new Error('falha ao mover projeto estrutural controlado')); };
      transacao.onabort = () => { banco.close(); reject(transacao.error || new Error('movimento estrutural controlado cancelado')); };
    };
  });
  const lerEstruturaProjetoWorkspaceControlado = (id) => new Promise((resolve, reject) => {
    const abertura = indexedDB.open('rebocl-workspace-local-v1');
    abertura.onerror = () => reject(abertura.error || new Error('não abriu leitura estrutural controlada'));
    abertura.onsuccess = () => {
      const banco = abertura.result;
      const transacao = banco.transaction(['projetos', 'arquivos'], 'readonly');
      const leituraProjeto = transacao.objectStore('projetos').get(id);
      const leituraArquivos = transacao.objectStore('arquivos').index('projetoId').getAll(id);
      let projeto = null;
      let arquivos = [];
      leituraProjeto.onsuccess = () => { projeto = leituraProjeto.result || null; };
      leituraArquivos.onsuccess = () => { arquivos = leituraArquivos.result || []; };
      leituraProjeto.onerror = () => reject(leituraProjeto.error || new Error('falha na leitura do projeto estrutural'));
      leituraArquivos.onerror = () => reject(leituraArquivos.error || new Error('falha na leitura dos arquivos estruturais'));
      transacao.oncomplete = () => { banco.close(); resolve({ projeto, arquivos }); };
      transacao.onerror = () => { banco.close(); reject(transacao.error || new Error('falha na leitura estrutural controlada')); };
      transacao.onabort = () => { banco.close(); reject(transacao.error || new Error('leitura estrutural controlada cancelada')); };
    };
  });
  const lerEstadoArquivoWorkspaceControlado = (id, projetoId) => new Promise((resolve, reject) => {
    const abertura = indexedDB.open('rebocl-workspace-local-v1');
    abertura.onerror = () => reject(abertura.error || new Error('não abriu leitura controlada'));
    abertura.onsuccess = () => {
      const banco = abertura.result;
      const transacao = banco.transaction(['arquivos', 'revisoes', 'projetos'], 'readonly');
      const leituraArquivo = transacao.objectStore('arquivos').get(id);
      const leituraRevisoes = transacao.objectStore('revisoes').getAll();
      const leituraProjeto = transacao.objectStore('projetos').get(projetoId);
      let arquivo = null;
      let revisoes = [];
      let projeto = null;
      leituraArquivo.onsuccess = () => { arquivo = leituraArquivo.result || null; };
      leituraRevisoes.onsuccess = () => { revisoes = (leituraRevisoes.result || []).filter((revisao) => revisao.arquivoId === id); };
      leituraProjeto.onsuccess = () => { projeto = leituraProjeto.result || null; };
      leituraArquivo.onerror = () => reject(leituraArquivo.error || new Error('falha na leitura do arquivo controlado'));
      leituraRevisoes.onerror = () => reject(leituraRevisoes.error || new Error('falha na leitura das revisões controladas'));
      leituraProjeto.onerror = () => reject(leituraProjeto.error || new Error('falha na leitura do projeto controlado'));
      transacao.oncomplete = () => { banco.close(); resolve({ arquivo, revisoes, projeto }); };
      transacao.onerror = () => { banco.close(); reject(transacao.error || new Error('falha na transação controlada')); };
    };
  });
  const esperarWorkspace = async (predicado, rotulo, tentativas = 30) => {
    for (let tentativa = 0; tentativa < tentativas; tentativa++) {
      if (predicado()) return;
      // O Chromium agenda IndexedDB no relógio virtual. Um salto espaçado dá
      // à transação real a vez de concluir, sem inundá-la com polling de 20 ms.
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
    if (predicado()) return;
    throw new Error('Workspace não concluiu a transação local controlada: ' + (rotulo || 'etapa sem nome'));
  };
  const esperarOrganizacao = async (predicado, rotulo, tentativas = 20) => {
    for (let tentativa = 0; tentativa < tentativas; tentativa++) {
      if (predicado()) return;
      // Favoritos também usam IndexedDB real; respeite o mesmo agendamento
      // virtual sem transformar uma espera de persistência em falso negativo.
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
    if (predicado()) return;
    throw new Error('Favoritos locais não concluíram a transação controlada: ' + (rotulo || 'etapa sem nome'));
  };
  const esperarColecoes = async (predicado, rotulo, tentativas = 20) => {
    for (let tentativa = 0; tentativa < tentativas; tentativa++) {
      if (predicado()) return;
      // Coleções são outro banco IndexedDB local; use a mesma espera espaçada
      // do relógio virtual sem tocar em rede, perfil real ou conversa do dono.
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
    if (predicado()) return;
    throw new Error('Coleções locais não concluíram a transação controlada: ' + (rotulo || 'etapa sem nome'));
  };
  const testarWorkspace = async () => {
    if (!location.pathname.endsWith('/index.html')) return '';
    if (![...document.styleSheets].some((folha) => String(folha.href || '').endsWith('/chat-estilos.css'))) {
      throw new Error('casca CSS local do Workspace não carregou');
    }
    const abrir = document.getElementById('btn-workspace');
    abrir.click();
    await esperar(() => visivel(document.getElementById('tela-workspace')), 5000, 'abrir Workspace');
    const parametros = new URL(location.href).searchParams;
    const viewport = parametros.get('viewport');
    if (viewport) {
      const trilhos = getComputedStyle(document.querySelector('.workspace-corpo')).gridTemplateColumns.trim().split(/\\s+/).filter(Boolean);
      if (viewport === 'desktop' && (matchMedia('(max-width: 900px)').matches || trilhos.length !== 3)) {
        throw new Error('Workspace não preservou o layout de três painéis no viewport desktop');
      }
      if (viewport === 'mobile' && (!matchMedia('(max-width: 900px)').matches || trilhos.length !== 1)) {
        throw new Error('Workspace não empilhou os painéis no viewport estreito');
      }
    }
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-projetos .workspace-projeto', 'Meu workspace'), 'projeto padrão');
    if (parametros.get('somente-layout') === '1') return ' · Workspace abriu com a casca local e o layout ' + viewport + ' controlado';

    const nomeProjeto = 'Projeto de fixture controlada';
    const nomeArquivo = 'nota-fixture.md';
    const conteudoInicial = 'conteúdo sintético da primeira versão';
    const conteudoFinal = 'conteúdo sintético da segunda versão';
    const novoProjeto = document.getElementById('workspace-novo-projeto');
    novoProjeto.value = nomeProjeto;
    document.getElementById('btn-workspace-criar-projeto').click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjeto), 'criar projeto');

    document.getElementById('btn-workspace-novo-arquivo').click();
    const nome = document.getElementById('workspace-nome-arquivo');
    const editor = document.getElementById('workspace-editor');
    await esperarWorkspace(() => !nome.disabled && !editor.disabled, 'criar arquivo');
    nome.value = nomeArquivo;
    nome.dispatchEvent(new Event('input', { bubbles: true }));
    editor.value = conteudoInicial;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btn-workspace-salvar').click();
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('Arquivo salvo localmente'), 'primeiro salvamento');

    editor.value = conteudoFinal;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btn-workspace-salvar').click();
    await esperarWorkspace(() => document.querySelectorAll('#workspace-lista-revisoes .workspace-revisao').length >= 1, 'criar revisão');
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('Arquivo salvo localmente'), 'segundo salvamento');

    document.getElementById('btn-workspace-apagar-arquivo').click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-lixeira .workspace-lixeira-item', nomeArquivo), 'arquivo na lixeira');
    let linha = porTexto(document, '#workspace-lista-lixeira .workspace-lixeira-item', nomeArquivo);
    const restaurarArquivo = porTexto(linha, 'button', 'Restaurar');
    if (!restaurarArquivo) throw new Error('restauração de arquivo não apareceu na lixeira');
    restaurarArquivo.click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-arquivos .workspace-arquivo', nomeArquivo), 'restaurar arquivo');
    await esperarWorkspace(() => editor.value === conteudoFinal, 'conteúdo restaurado');

    document.getElementById('btn-workspace-apagar-projeto').click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-lixeira .workspace-lixeira-item', nomeProjeto), 'projeto na lixeira');
    linha = porTexto(document, '#workspace-lista-lixeira .workspace-lixeira-item', nomeProjeto);
    const restaurarProjeto = porTexto(linha, 'button', 'Restaurar');
    if (!restaurarProjeto) throw new Error('restauração de projeto não apareceu na lixeira');
    restaurarProjeto.click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjeto), 'restaurar projeto');
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-arquivos .workspace-arquivo', nomeArquivo), 'arquivo após restaurar projeto');

    const nomeArquivoLixeira = 'apagado-fixture.md';
    document.getElementById('btn-workspace-novo-arquivo').click();
    await esperarWorkspace(() => !nome.disabled && !editor.disabled, 'criar arquivo para lixeira do arquivo completo');
    nome.value = nomeArquivoLixeira;
    nome.dispatchEvent(new Event('input', { bubbles: true }));
    editor.value = 'conteúdo sintético recuperável';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btn-workspace-salvar').click();
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('Arquivo salvo localmente'), 'salvar arquivo para lixeira do arquivo completo');
    document.getElementById('btn-workspace-apagar-arquivo').click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-lixeira .workspace-lixeira-item', nomeArquivoLixeira), 'arquivo recuperável antes do arquivo completo');

    const nomeProjetoBuscaGlobal = 'Projeto de busca global controlada';
    const nomeArquivoBuscaGlobal = 'referencia-global.md';
    const conteudoBuscaGlobal = 'agulha global sintética';
    novoProjeto.value = nomeProjetoBuscaGlobal;
    document.getElementById('btn-workspace-criar-projeto').click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjetoBuscaGlobal), 'criar projeto para busca global');
    document.getElementById('btn-workspace-novo-arquivo').click();
    await esperarWorkspace(() => !nome.disabled && !editor.disabled, 'criar arquivo para busca global');
    nome.value = nomeArquivoBuscaGlobal;
    nome.dispatchEvent(new Event('input', { bubbles: true }));
    editor.value = conteudoBuscaGlobal;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btn-workspace-salvar').click();
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('Arquivo salvo localmente'), 'salvar arquivo para busca global');
    const edicaoPendenteAntesDaTroca = conteudoBuscaGlobal + ' com edição pendente';
    editor.value = edicaoPendenteAntesDaTroca;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('Alterações pendentes'), 'registrar edição pendente antes da troca global');

    const buscaArquivos = document.getElementById('workspace-busca-arquivos');
    const buscaGlobal = document.getElementById('btn-workspace-busca-global');
    const ajudaBuscaGlobal = document.getElementById('workspace-ajuda-busca');
    if (!buscaArquivos || !buscaGlobal || !ajudaBuscaGlobal || buscaGlobal.getAttribute('aria-pressed') !== 'false') throw new Error('controles acessíveis da busca global do Workspace ausentes');
    buscaArquivos.value = conteudoFinal;
    buscaArquivos.dispatchEvent(new Event('input', { bubbles: true }));
    await esperarWorkspace(() => document.getElementById('workspace-contador-arquivos').textContent.includes('0 resultado'), 'busca padrão limitada ao projeto atual');
    if (porTexto(document, '#workspace-lista-arquivos .workspace-arquivo', nomeArquivo)) throw new Error('busca local mostrou arquivo de outro projeto antes da escolha explícita');
    buscaGlobal.click();
    await esperarWorkspace(() => buscaGlobal.getAttribute('aria-pressed') === 'true' && ajudaBuscaGlobal.textContent.includes('Lixeira ficam fora'), 'ativar busca global explícita');
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-arquivos .workspace-arquivo', nomeArquivo), 'encontrar arquivo em outro projeto');
    const resultadoBuscaOrigem = porTexto(document, '#workspace-lista-arquivos .workspace-arquivo', nomeArquivo);
    if (!resultadoBuscaOrigem.textContent.includes(nomeProjeto)) throw new Error('busca global não identificou o projeto de origem local');
    resultadoBuscaOrigem.click();
    await esperarWorkspace(() => document.getElementById('workspace-nome-projeto').value === nomeProjeto && editor.value === conteudoFinal, 'abrir resultado global no projeto de origem');

    buscaArquivos.value = 'conteúdo sintético recuperável';
    buscaArquivos.dispatchEvent(new Event('input', { bubbles: true }));
    await esperarWorkspace(() => document.getElementById('workspace-contador-arquivos').textContent.includes('0 resultado'), 'manter Lixeira fora da busca global');
    if (porTexto(document, '#workspace-lista-arquivos .workspace-arquivo', nomeArquivoLixeira)) throw new Error('busca global expôs item recuperável da Lixeira');
    buscaArquivos.value = conteudoBuscaGlobal;
    buscaArquivos.dispatchEvent(new Event('input', { bubbles: true }));
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-arquivos .workspace-arquivo', nomeArquivoBuscaGlobal), 'localizar projeto global pela consulta');
    porTexto(document, '#workspace-lista-arquivos .workspace-arquivo', nomeArquivoBuscaGlobal).click();
    await esperarWorkspace(() => document.getElementById('workspace-nome-projeto').value === nomeProjetoBuscaGlobal && editor.value === edicaoPendenteAntesDaTroca, 'abrir resultado no outro projeto sem perder edição pendente');
    buscaGlobal.click();
    await esperarWorkspace(() => buscaGlobal.getAttribute('aria-pressed') === 'false', 'desativar busca global explicitamente');
    buscaArquivos.value = '';
    buscaArquivos.dispatchEvent(new Event('input', { bubbles: true }));
    porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjeto).click();
    await esperarWorkspace(() => document.getElementById('workspace-nome-projeto').value === nomeProjeto && porNomeArquivoExato(nomeArquivo), 'retornar ao projeto para transferências posteriores');
    porNomeArquivoExato(nomeArquivo).click();
    await esperarWorkspace(() => editor.value === conteudoFinal, 'abrir arquivo para conflito local controlado');

    // A renomeação comum também precisa consultar os irmãos que existem agora,
    // e não apenas a lista que esta tela carregou antes da outra guia criar um.
    const nomeProjetoRenomeacaoArquivo = 'Projeto de renomeação de arquivo controlada';
    const nomeBaseRenomeacaoArquivo = 'rascunho-renomeacao.md';
    const nomeConcorrenteRenomeacao = 'destino-concorrente.md';
    novoProjeto.value = nomeProjetoRenomeacaoArquivo;
    document.getElementById('btn-workspace-criar-projeto').click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjetoRenomeacaoArquivo), 'criar projeto para renomeação de arquivo concorrente');
    document.getElementById('btn-workspace-novo-arquivo').click();
    await esperarWorkspace(() => !nome.disabled && !editor.disabled, 'criar arquivo para renomeação concorrente');
    nome.value = nomeBaseRenomeacaoArquivo;
    nome.dispatchEvent(new Event('input', { bubbles: true }));
    editor.value = 'conteúdo sintético para renomeação concorrente';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btn-workspace-salvar').click();
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('Arquivo salvo localmente'), 'salvar arquivo para renomeação concorrente');
    const arquivoRenomeacao = porNomeArquivoExato(nomeBaseRenomeacaoArquivo);
    const estadoAntesRenomeacao = await lerEstadoArquivoWorkspaceControlado(arquivoRenomeacao.dataset.arquivoId, arquivoRenomeacao.dataset.projetoId);
    const irmaoRenomeacao = await adicionarArquivoWorkspaceControlado(arquivoRenomeacao.dataset.projetoId, nomeConcorrenteRenomeacao, 'irmão sintético já persistido');
    nome.value = nomeConcorrenteRenomeacao;
    nome.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btn-workspace-salvar').click();
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('Já existe um arquivo local com esse nome'), 'bloquear renomeação contra irmão persistido');
    const estadoDepoisRenomeacao = await lerEstadoArquivoWorkspaceControlado(arquivoRenomeacao.dataset.arquivoId, arquivoRenomeacao.dataset.projetoId);
    const estadoIrmaoRenomeacao = await lerEstadoArquivoWorkspaceControlado(irmaoRenomeacao.arquivo.id, arquivoRenomeacao.dataset.projetoId);
    if (estadoDepoisRenomeacao.arquivo.nome !== nomeBaseRenomeacaoArquivo || estadoDepoisRenomeacao.arquivo.conteudo !== estadoAntesRenomeacao.arquivo.conteudo || estadoDepoisRenomeacao.arquivo.versao !== estadoAntesRenomeacao.arquivo.versao || estadoDepoisRenomeacao.revisoes.length !== estadoAntesRenomeacao.revisoes.length || estadoDepoisRenomeacao.projeto.atualizadoEm !== irmaoRenomeacao.projeto.atualizadoEm || !estadoIrmaoRenomeacao.arquivo || estadoIrmaoRenomeacao.arquivo.nome !== nomeConcorrenteRenomeacao) {
      throw new Error('renomeação desatualizada alterou o original, revisão, projeto ou irmão concorrente persistido');
    }
    nome.value = nomeBaseRenomeacaoArquivo;
    nome.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btn-workspace-salvar').click();
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('Já estava salvo'), 'manter rascunho após recusa de nome concorrente');
    porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjeto).click();
    await esperarWorkspace(() => document.getElementById('workspace-nome-projeto').value === nomeProjeto && porNomeArquivoExato(nomeArquivo), 'retornar após renomeação concorrente');
    porNomeArquivoExato(nomeArquivo).click();
    await esperarWorkspace(() => editor.value === conteudoFinal, 'retomar arquivo principal depois da renomeação concorrente');

    const rascunhoParaCopia = conteudoFinal + ' com rascunho concorrente para cópia';
    editor.value = rascunhoParaCopia;
    const arquivoOriginal = porNomeArquivoExato(nomeArquivo);
    const estadoAntesConflito = await lerEstadoArquivoWorkspaceControlado(arquivoOriginal.dataset.arquivoId, arquivoOriginal.dataset.projetoId);
    await atualizarArquivoWorkspaceControlado(arquivoOriginal.dataset.arquivoId, conteudoFinal);
    const estadoRemotoConflito = await lerEstadoArquivoWorkspaceControlado(arquivoOriginal.dataset.arquivoId, arquivoOriginal.dataset.projetoId);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('Alterações pendentes'), 'editar antes da escrita concorrente controlada');
    document.getElementById('btn-workspace-salvar').click();
    const painelConflito = document.getElementById('workspace-conflito-arquivo');
    await esperarWorkspace(() => visivel(painelConflito) && document.getElementById('workspace-status').textContent.includes('mudou em outra guia'), 'detectar conflito sem substituir arquivo');
    if (editor.value !== rascunhoParaCopia || !document.getElementById('btn-workspace-salvar').disabled || !document.getElementById('btn-workspace-apagar-arquivo').disabled) {
      throw new Error('conflito não preservou o rascunho ou ainda permitiu substituir o original');
    }
    const estadoDepoisConflito = await lerEstadoArquivoWorkspaceControlado(arquivoOriginal.dataset.arquivoId, arquivoOriginal.dataset.projetoId);
    if (estadoDepoisConflito.arquivo.conteudo !== conteudoFinal || estadoDepoisConflito.arquivo.versao !== estadoRemotoConflito.arquivo.versao) {
      throw new Error('conflito substituiu o conteúdo ou a versão persistida pela escrita local pendente');
    }
    if (estadoDepoisConflito.revisoes.length !== estadoRemotoConflito.revisoes.length || estadoDepoisConflito.projeto.atualizadoEm !== estadoRemotoConflito.projeto.atualizadoEm) {
      throw new Error('conflito alterou revisão ou metadado de projeto depois da divergência');
    }
    if (estadoRemotoConflito.revisoes.length !== estadoAntesConflito.revisoes.length) throw new Error('fixture concorrente alterou revisão em vez de somente o arquivo');
    // Outra guia ocupa o primeiro nome automático da cópia depois do conflito.
    // A escolha explícita deve preservar o rascunho, mas isolar o nome na
    // fotografia atual do IndexedDB efêmero, sem substituir esse irmão.
    const nomeCopiaConflitoOcupado = 'nota-fixture (minha cópia).md';
    const irmaoCopiaConflito = await adicionarArquivoWorkspaceControlado(arquivoOriginal.dataset.projetoId, nomeCopiaConflitoOcupado, 'irmão sintético da cópia', 'arquivo-concorrente-copia');
    document.getElementById('btn-workspace-copiar-conflito').click();
    const nomeCopiaConflitoIsolado = 'nota-fixture (minha cópia 2).md';
    await esperarWorkspace(() => !visivel(painelConflito) && editor.value === rascunhoParaCopia && document.getElementById('workspace-nome-arquivo').value === nomeCopiaConflitoIsolado, 'salvar rascunho conflitante com nome isolado atual');
    const linhaCopiaConflito = porNomeArquivoExato(nomeCopiaConflitoIsolado);
    const estadoCopiaConflito = await lerEstadoArquivoWorkspaceControlado(linhaCopiaConflito.dataset.arquivoId, linhaCopiaConflito.dataset.projetoId);
    const estadoIrmaoCopiaConflito = await lerEstadoArquivoWorkspaceControlado(irmaoCopiaConflito.arquivo.id, arquivoOriginal.dataset.projetoId);
    if (estadoCopiaConflito.arquivo.conteudo !== rascunhoParaCopia || !estadoIrmaoCopiaConflito.arquivo || estadoIrmaoCopiaConflito.arquivo.nome !== nomeCopiaConflitoOcupado) {
      throw new Error('cópia de conflito não preservou rascunho ou substituiu irmão de nome concorrente');
    }
    porNomeArquivoExato(nomeArquivo).click();
    await esperarWorkspace(() => editor.value === conteudoFinal, 'voltar ao original depois da cópia de conflito');

    const rascunhoParaBaixar = conteudoFinal + ' com rascunho concorrente para baixar';
    editor.value = rascunhoParaBaixar;
    const arquivoOriginalReaberto = porNomeArquivoExato(nomeArquivo);
    await atualizarArquivoWorkspaceControlado(arquivoOriginalReaberto.dataset.arquivoId, conteudoFinal);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btn-workspace-salvar').click();
    await esperarWorkspace(() => visivel(painelConflito), 'detectar segundo conflito local controlado');
    const blobsAntesConflito = window.__blobsBackupsLocais.length;
    document.getElementById('btn-workspace-baixar-conflito').click();
    await esperarWorkspace(() => window.__blobsBackupsLocais.length === blobsAntesConflito + 1, 'baixar rascunho em conflito');
    if ((await window.__blobsBackupsLocais[window.__blobsBackupsLocais.length - 1].text()) !== rascunhoParaBaixar) throw new Error('download controlado não preservou o rascunho em conflito');
    document.getElementById('btn-workspace-recarregar-conflito').click();
    await esperarWorkspace(() => !visivel(painelConflito) && editor.value === conteudoFinal && document.getElementById('workspace-status').textContent.includes('Versão salva recarregada'), 'recarregar versão salva por escolha explícita');

    // A mesma guarda cobre o caminho destrutivo: uma guia desatualizada não
    // transforma em lixeira o registro que outra escrita local acabou de mudar.
    const arquivoAntesDaLixeira = porNomeArquivoExato(nomeArquivo);
    await atualizarArquivoWorkspaceControlado(arquivoAntesDaLixeira.dataset.arquivoId, conteudoFinal);
    const estadoAntesDaLixeira = await lerEstadoArquivoWorkspaceControlado(arquivoAntesDaLixeira.dataset.arquivoId, arquivoAntesDaLixeira.dataset.projetoId);
    document.getElementById('btn-workspace-apagar-arquivo').click();
    await esperarWorkspace(() => visivel(painelConflito) && document.getElementById('workspace-status').textContent.includes('mudou em outra guia'), 'bloquear lixeira desatualizada sem descartar arquivo');
    const estadoDepoisDaLixeira = await lerEstadoArquivoWorkspaceControlado(arquivoAntesDaLixeira.dataset.arquivoId, arquivoAntesDaLixeira.dataset.projetoId);
    if (estadoDepoisDaLixeira.arquivo.lixeiraEm || estadoDepoisDaLixeira.arquivo.versao !== estadoAntesDaLixeira.arquivo.versao || estadoDepoisDaLixeira.arquivo.conteudo !== conteudoFinal) {
      throw new Error('lixeira desatualizada alterou o arquivo persistido pela outra escrita local');
    }
    document.getElementById('btn-workspace-recarregar-conflito').click();
    await esperarWorkspace(() => !visivel(painelConflito) && editor.value === conteudoFinal, 'recarregar depois de bloquear lixeira desatualizada');

    // Projeto também não pode reutilizar a lista antiga de filhos: esta escrita
    // controlada só atualiza o filho no IndexedDB efêmero, sem tocar o projeto,
    // e o clique antigo precisa preservar ambos em vez de movê-los à Lixeira.
    const arquivoAntesProjetoLixeira = porNomeArquivoExato(nomeArquivo);
    await atualizarArquivoWorkspaceControlado(arquivoAntesProjetoLixeira.dataset.arquivoId, conteudoFinal);
    const estadoAntesProjetoLixeira = await lerEstadoArquivoWorkspaceControlado(arquivoAntesProjetoLixeira.dataset.arquivoId, arquivoAntesProjetoLixeira.dataset.projetoId);
    document.getElementById('btn-workspace-apagar-projeto').click();
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('A lixeira mudou em outra guia'), 'bloquear projeto com filho desatualizado');
    const estadoDepoisProjetoLixeira = await lerEstadoArquivoWorkspaceControlado(arquivoAntesProjetoLixeira.dataset.arquivoId, arquivoAntesProjetoLixeira.dataset.projetoId);
    if (estadoDepoisProjetoLixeira.projeto.lixeiraEm || estadoDepoisProjetoLixeira.arquivo.lixeiraEm || estadoDepoisProjetoLixeira.arquivo.versao !== estadoAntesProjetoLixeira.arquivo.versao || estadoDepoisProjetoLixeira.arquivo.conteudo !== conteudoFinal) {
      throw new Error('lixeira desatualizada do projeto alterou projeto ou filho persistidos');
    }
    await esperarWorkspace(() => porNomeArquivoExato(nomeArquivo) && editor.value === conteudoFinal, 'recarregar depois de bloquear projeto desatualizado');

    // A criação e a renomeação também partiam da fotografia da tela. Cada uma
    // recebe um projeto vazio que outra guia já moveu somente no IndexedDB
    // efêmero; nenhuma pode devolver o projeto à lista ativa ou criar filho.
    const nomeProjetoArquivoEstrutural = 'Projeto de arquivo estrutural controlado';
    novoProjeto.value = nomeProjetoArquivoEstrutural;
    document.getElementById('btn-workspace-criar-projeto').click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjetoArquivoEstrutural), 'criar projeto para criação estrutural concorrente');
    const alvoArquivoEstrutural = porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjetoArquivoEstrutural);
    await moverProjetoWorkspaceControlado(alvoArquivoEstrutural.dataset.projetoId);
    document.getElementById('btn-workspace-novo-arquivo').click();
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('O projeto mudou em outra guia') && !porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjetoArquivoEstrutural), 'bloquear criação sob projeto movido por outra guia');
    const estadoArquivoEstrutural = await lerEstruturaProjetoWorkspaceControlado(alvoArquivoEstrutural.dataset.projetoId);
    if (!estadoArquivoEstrutural.projeto || !estadoArquivoEstrutural.projeto.lixeiraEm || estadoArquivoEstrutural.projeto.nome !== nomeProjetoArquivoEstrutural || estadoArquivoEstrutural.arquivos.length) {
      throw new Error('criação estrutural reativou projeto recuperável ou gravou filho depois da mutação concorrente');
    }

    const nomeProjetoRenomeacaoEstrutural = 'Projeto de renomeação estrutural controlada';
    novoProjeto.value = nomeProjetoRenomeacaoEstrutural;
    document.getElementById('btn-workspace-criar-projeto').click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjetoRenomeacaoEstrutural), 'criar projeto para renomeação estrutural concorrente');
    const alvoRenomeacaoEstrutural = porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjetoRenomeacaoEstrutural);
    await moverProjetoWorkspaceControlado(alvoRenomeacaoEstrutural.dataset.projetoId);
    document.getElementById('workspace-nome-projeto').value = 'Tentativa antiga de renomear';
    document.getElementById('btn-workspace-renomear-projeto').click();
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('O projeto mudou em outra guia') && !porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjetoRenomeacaoEstrutural), 'bloquear renomeação de projeto movido por outra guia');
    const estadoRenomeacaoEstrutural = await lerEstruturaProjetoWorkspaceControlado(alvoRenomeacaoEstrutural.dataset.projetoId);
    if (!estadoRenomeacaoEstrutural.projeto || !estadoRenomeacaoEstrutural.projeto.lixeiraEm || estadoRenomeacaoEstrutural.projeto.nome !== nomeProjetoRenomeacaoEstrutural) {
      throw new Error('renomeação estrutural reativou ou sobrescreveu projeto recuperável');
    }
    porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjeto).click();
    await esperarWorkspace(() => document.getElementById('workspace-nome-projeto').value === nomeProjeto && porNomeArquivoExato(nomeArquivo), 'retornar ao projeto depois da proteção estrutural');

    const exportarProjetoPortatil = document.getElementById('btn-workspace-exportar-projeto');
    const importarProjetoPortatil = document.getElementById('btn-workspace-importar-projeto');
    const entradaProjetoPortatil = document.getElementById('workspace-projeto-portatil-importar');
    if (!exportarProjetoPortatil || !importarProjetoPortatil || !entradaProjetoPortatil) throw new Error('controles do projeto portátil do Workspace ausentes');
    await esperarWorkspace(() => !exportarProjetoPortatil.disabled && !importarProjetoPortatil.disabled && !entradaProjetoPortatil.disabled, 'controles do projeto portátil prontos');
    const blobsAntesProjetoPortatil = window.__blobsBackupsLocais.length;
    exportarProjetoPortatil.click();
    await esperarWorkspace(() => window.__blobsBackupsLocais.length === blobsAntesProjetoPortatil + 1, 'exportar projeto portátil');
    const projetoPortatilExportado = JSON.parse(await window.__blobsBackupsLocais[window.__blobsBackupsLocais.length - 1].text());
    if (projetoPortatilExportado.formato !== 'rebocl-workspace-projeto' || projetoPortatilExportado.versao !== 1 || projetoPortatilExportado.projeto.nome !== nomeProjeto || !projetoPortatilExportado.arquivos.some(arquivo => arquivo.nome === nomeArquivo) || !projetoPortatilExportado.arquivos.some(arquivo => arquivo.nome === nomeArquivoLixeira && arquivo.lixeiraRaiz === 'arquivo') || !projetoPortatilExportado.revisoes.length) {
      throw new Error('projeto portátil não preservou projeto, arquivo, versão e lixeira sintéticos');
    }

    const projetosAntesProjetoPortatil = document.querySelectorAll('#workspace-lista-projetos .workspace-projeto').length;
    const projetoPortatilInvalido = JSON.parse(JSON.stringify(projetoPortatilExportado));
    projetoPortatilInvalido.arquivos[0].projetoId = 'projeto-estranho';
    const transferenciaProjetoInvalida = new DataTransfer();
    transferenciaProjetoInvalida.items.add(new File([JSON.stringify(projetoPortatilInvalido)], 'projeto-portatil-invalido.json', { type: 'application/json' }));
    entradaProjetoPortatil.files = transferenciaProjetoInvalida.files;
    entradaProjetoPortatil.dispatchEvent(new Event('change', { bubbles: true }));
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('está inválido'), 'rejeitar projeto portátil inválido antes da escrita');
    await esperarWorkspace(() => !exportarProjetoPortatil.disabled && !importarProjetoPortatil.disabled && !entradaProjetoPortatil.disabled, 'liberar controles após projeto portátil inválido');
    if (document.querySelectorAll('#workspace-lista-projetos .workspace-projeto').length !== projetosAntesProjetoPortatil || !porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjeto)) {
      throw new Error('projeto portátil inválido alterou a fixture local');
    }

    const confirmarProjetoAnterior = window.confirm;
    window.confirm = () => false;
    const transferenciaProjetoCancelada = new DataTransfer();
    transferenciaProjetoCancelada.items.add(new File([JSON.stringify(projetoPortatilExportado)], 'projeto-portatil-cancelado.json', { type: 'application/json' }));
    entradaProjetoPortatil.files = transferenciaProjetoCancelada.files;
    entradaProjetoPortatil.dispatchEvent(new Event('change', { bubbles: true }));
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('cancelada'), 'cancelar adição do projeto portátil');
    await esperarWorkspace(() => !exportarProjetoPortatil.disabled && !importarProjetoPortatil.disabled && !entradaProjetoPortatil.disabled, 'liberar controles após cancelamento portátil');
    if (document.querySelectorAll('#workspace-lista-projetos .workspace-projeto').length !== projetosAntesProjetoPortatil) throw new Error('cancelamento do projeto portátil alterou a fixture local');
    window.confirm = confirmarProjetoAnterior;

    const transferenciaProjetoFinal = new DataTransfer();
    transferenciaProjetoFinal.items.add(new File([JSON.stringify(projetoPortatilExportado)], 'projeto-portatil-fixture.json', { type: 'application/json' }));
    entradaProjetoPortatil.files = transferenciaProjetoFinal.files;
    entradaProjetoPortatil.dispatchEvent(new Event('change', { bubbles: true }));
    await esperarWorkspace(() => document.querySelectorAll('#workspace-lista-projetos .workspace-projeto').length === projetosAntesProjetoPortatil + 1 && document.getElementById('workspace-status').textContent.includes('Projeto portátil adicionado'), 'adicionar projeto portátil');
    const projetosPortateis = [...document.querySelectorAll('#workspace-lista-projetos .workspace-projeto')].filter(item => item.textContent.includes(nomeProjeto));
    if (projetosPortateis.length < 2 || new Set(projetosPortateis.map(item => item.textContent)).size !== projetosPortateis.length) {
      throw new Error('projeto portátil não preservou a origem e não resolveu o nome local');
    }
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-arquivos .workspace-arquivo', nomeArquivo), 'arquivo ativo no projeto portátil adicionado');
    await esperarWorkspace(() => [...document.querySelectorAll('#workspace-lista-lixeira .workspace-lixeira-item')].filter(item => item.textContent.includes(nomeArquivoLixeira)).length >= 2, 'lixeira no projeto portátil adicionado');
    porTexto(document, '#workspace-lista-arquivos .workspace-arquivo', nomeArquivo).click();
    await esperarWorkspace(() => editor.value === conteudoFinal && document.querySelectorAll('#workspace-lista-revisoes .workspace-revisao').length >= 1, 'versão no projeto portátil adicionado');

    const exportarCompleto = document.getElementById('btn-workspace-exportar-completo');
    const restaurarCompleto = document.getElementById('btn-workspace-restaurar-completo');
    const desfazerCompleto = document.getElementById('btn-workspace-desfazer-restauracao');
    const entradaCompleta = document.getElementById('workspace-arquivo-completo-importar');
    if (!exportarCompleto || !restaurarCompleto || !desfazerCompleto || !entradaCompleta) throw new Error('controles do arquivo completo do Workspace ausentes');
    if (!desfazerCompleto.disabled) throw new Error('desfazer completo começou ativo sem uma restauração controlada');
    const blobsAntesArquivoCompleto = window.__blobsBackupsLocais.length;
    exportarCompleto.click();
    await esperarWorkspace(() => window.__blobsBackupsLocais.length === blobsAntesArquivoCompleto + 1, 'exportar arquivo completo do Workspace');
    const arquivoCompletoExportado = JSON.parse(await window.__blobsBackupsLocais[window.__blobsBackupsLocais.length - 1].text());
    if (arquivoCompletoExportado.formato !== 'rebocl-workspace-arquivo-completo' || arquivoCompletoExportado.versao !== 1 || !arquivoCompletoExportado.arquivos.some(arquivo => arquivo.nome === nomeArquivo) || !arquivoCompletoExportado.arquivos.some(arquivo => arquivo.nome === nomeArquivoLixeira && arquivo.lixeiraRaiz === 'arquivo') || !arquivoCompletoExportado.revisoes.length) {
      throw new Error('arquivo completo não preservou arquivo, versão e lixeira sintéticos');
    }

    const arquivoCompletoInvalido = new File([JSON.stringify(Object.assign({}, arquivoCompletoExportado, { versao: 2 }))], 'workspace-completo-invalido.json', { type: 'application/json' });
    const transferenciaInvalida = new DataTransfer();
    transferenciaInvalida.items.add(arquivoCompletoInvalido);
    entradaCompleta.files = transferenciaInvalida.files;
    entradaCompleta.dispatchEvent(new Event('change', { bubbles: true }));
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('está inválido'), 'rejeitar arquivo completo inválido antes da escrita');
    await esperarWorkspace(() => !exportarCompleto.disabled && !entradaCompleta.disabled, 'liberar controles após arquivo completo inválido');
    if (!porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjeto) || !porTexto(document, '#workspace-lista-lixeira .workspace-lixeira-item', nomeArquivoLixeira)) {
      throw new Error('arquivo completo inválido alterou a fixture local');
    }
    if (!desfazerCompleto.disabled) throw new Error('arquivo completo inválido criou ponto de desfazer');

    const projetoPosterior = 'Projeto posterior à fixture';
    novoProjeto.value = projetoPosterior;
    document.getElementById('btn-workspace-criar-projeto').click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-projetos .workspace-projeto', projetoPosterior), 'alterar Workspace após exportação completa');
    const arquivoRestauracaoCompleta = new File([JSON.stringify(arquivoCompletoExportado)], 'workspace-completo-fixture.json', { type: 'application/json' });
    const transferenciaCompleta = new DataTransfer();
    transferenciaCompleta.items.add(arquivoRestauracaoCompleta);
    const confirmarAnterior = window.confirm;
    window.confirm = () => false;
    entradaCompleta.files = transferenciaCompleta.files;
    entradaCompleta.dispatchEvent(new Event('change', { bubbles: true }));
    await esperarWorkspace(() => document.getElementById('workspace-status').textContent.includes('cancelada'), 'cancelar restauração completa');
    await esperarWorkspace(() => !exportarCompleto.disabled && !entradaCompleta.disabled, 'liberar controles após cancelamento completo');
    if (!porTexto(document, '#workspace-lista-projetos .workspace-projeto', projetoPosterior)) throw new Error('cancelamento do arquivo completo alterou a fixture local');
    if (!desfazerCompleto.disabled) throw new Error('cancelamento do arquivo completo criou ponto de desfazer');
    window.confirm = confirmarAnterior;
    const transferenciaFinal = new DataTransfer();
    transferenciaFinal.items.add(new File([JSON.stringify(arquivoCompletoExportado)], 'workspace-completo-fixture-final.json', { type: 'application/json' }));
    entradaCompleta.files = transferenciaFinal.files;
    entradaCompleta.dispatchEvent(new Event('change', { bubbles: true }));
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjeto) && !porTexto(document, '#workspace-lista-projetos .workspace-projeto', projetoPosterior), 'restaurar arquivo completo substituindo a alteração posterior');
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-lixeira .workspace-lixeira-item', nomeArquivoLixeira), 'lixeira restaurada pelo arquivo completo');
    const projetoRestaurado = porTexto(document, '#workspace-lista-projetos .workspace-projeto', nomeProjeto);
    projetoRestaurado.click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-arquivos .workspace-arquivo', nomeArquivo), 'arquivo ativo restaurado pelo arquivo completo');
    porTexto(document, '#workspace-lista-arquivos .workspace-arquivo', nomeArquivo).click();
    await esperarWorkspace(() => editor.value === conteudoFinal && document.querySelectorAll('#workspace-lista-revisoes .workspace-revisao').length >= 1, 'conteúdo e versão restaurados pelo arquivo completo');
    if (!document.getElementById('workspace-status').textContent.includes('Arquivo completo restaurado')) {
      throw new Error('restauração completa não informou a substituição local controlada');
    }
    await esperarWorkspace(() => !desfazerCompleto.disabled, 'liberar ponto temporário após restauração completa');
    const projetoDepoisDaRestauracao = 'Alteração concorrente após a restauração';
    await adicionarProjetoWorkspaceControlado(projetoDepoisDaRestauracao);
    desfazerCompleto.click();
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-projetos .workspace-projeto', projetoDepoisDaRestauracao) && document.getElementById('workspace-status').textContent.includes('mudou em outra guia'), 'bloquear desfazer completo desatualizado sem apagar projeto concorrente');
    if (desfazerCompleto.disabled) throw new Error('conflito do arquivo completo consumiu o ponto temporário');

    // Uma nova restauração cria uma fotografia posterior à escrita concorrente.
    // Sem mudança após ela, o retorno único volta a ser permitido e consumido.
    const transferenciaRearmada = new DataTransfer();
    transferenciaRearmada.items.add(new File([JSON.stringify(arquivoCompletoExportado)], 'workspace-completo-fixture-rearmado.json', { type: 'application/json' }));
    entradaCompleta.files = transferenciaRearmada.files;
    entradaCompleta.dispatchEvent(new Event('change', { bubbles: true }));
    await esperarWorkspace(() => !porTexto(document, '#workspace-lista-projetos .workspace-projeto', projetoDepoisDaRestauracao) && document.getElementById('workspace-status').textContent.includes('Arquivo completo restaurado'), 'restaurar novamente depois do conflito completo');
    await esperarWorkspace(() => !desfazerCompleto.disabled, 'novo ponto temporário após restauração controlada');
    desfazerCompleto.click();
    await esperarWorkspace(() => !porTexto(document, '#workspace-lista-projetos .workspace-projeto', projetoPosterior) && porTexto(document, '#workspace-lista-projetos .workspace-projeto', projetoDepoisDaRestauracao) && document.getElementById('workspace-status').textContent.includes('desfeita'), 'desfazer restauração completa sem alteração posterior');
    await esperarWorkspace(() => porTexto(document, '#workspace-lista-lixeira .workspace-lixeira-item', nomeArquivoLixeira), 'lixeira no ponto temporário restaurado');
    if (!desfazerCompleto.disabled) throw new Error('ponto temporário não foi consumido depois de desfazer a restauração sem conflito');

    if (!document.getElementById('workspace-status').textContent.toLowerCase().includes('nada foi enviado')) {
      throw new Error('ciclo local não declarou a ausência de envio');
    }
    return ' · Workspace criou, versionou, protegeu rascunho, criação/renomeação e lixeira em conflito local, buscou entre projetos sem expor Lixeira, transferiu projeto portátil com nome isolado, recuperou e rejeitou/cancelou/arquivou/restaurou/desfez arquivo, versão e lixeira somente na fixture; bloqueou retorno completo diante de escrita concorrente e preservou o ponto e isolou a cópia de conflito contra irmão atual';
  };
  try {
    await esperar(() => document.querySelectorAll('#lista .conv').length >= 52, 5000, 'lista inicial');
    const estrelaAtual = () => document.querySelector('#lista .conv-conversa[data-conversa-numero="1"] .conv-favorita');
    const filtroFavoritas = document.getElementById('btn-filtrar-favoritas');
    if (!estrelaAtual() || !filtroFavoritas) throw new Error('controles de favoritos locais ausentes');
    // A abertura real do IndexedDB pode rerenderizar os cartões entre estas duas
    // etapas; consulte o controle atual para não clicar em um nó já substituído.
    await esperarOrganizacao(() => {
      const estrela = estrelaAtual();
      return !!estrela && !estrela.disabled && !filtroFavoritas.disabled;
    }, 'favoritos locais prontos');
    estrelaAtual().click();
    await esperarOrganizacao(() => document.querySelector('#lista .conv-conversa[data-conversa-numero="1"] .conv-favorita').getAttribute('aria-pressed') === 'true', 'marcar favorito');
    filtroFavoritas.click();
    await esperar(() => filtroFavoritas.getAttribute('aria-pressed') === 'true', 5000, 'ativar filtro de favoritas');
    const visiveisFavoritas = [...document.querySelectorAll('#lista .conv-conversa')].filter(visivel);
    if (visiveisFavoritas.length !== 1 || !visiveisFavoritas[0].textContent.includes('Página um 1')) {
      throw new Error('filtro local não isolou a conversa favorita');
    }
    if (!visivel(document.getElementById('card-mais'))) throw new Error('carregar mais sumiu no filtro de favoritas');
    filtroFavoritas.click();
    await esperar(() => filtroFavoritas.getAttribute('aria-pressed') === 'false', 5000, 'desativar filtro de favoritas');

    const exportarFavoritos = document.getElementById('btn-exportar-favoritos');
    const importarFavoritos = document.getElementById('btn-importar-favoritos');
    const arquivoFavoritos = document.getElementById('arq-importar-favoritos');
    const favoritaDoNumero = (numero) => document.querySelector('#lista .conv-conversa[data-conversa-numero="' + numero + '"] .conv-favorita');
    if (!exportarFavoritos || !importarFavoritos || !arquivoFavoritos || !favoritaDoNumero(1) || !favoritaDoNumero(2)) {
      throw new Error('controles de backup dos favoritos ausentes');
    }
    await esperarOrganizacao(() => !exportarFavoritos.disabled && !importarFavoritos.disabled, 'backup dos favoritos pronto');
    exportarFavoritos.click();
    await esperarOrganizacao(() => window.__blobsBackupsLocais.length === 1, 'exportar backup dos favoritos');
    const favoritosExportados = JSON.parse(await window.__blobsBackupsLocais[0].text());
    if (favoritosExportados.formato !== 'rebocl-favoritos-conversas' || favoritosExportados.versao !== 1 || String(favoritosExportados.favoritos) !== '1') {
      throw new Error('backup dos favoritos não preservou somente o número local controlado');
    }
    const restauracaoFavoritos = { formato: 'rebocl-favoritos-conversas', versao: 1, favoritos: [2] };
    const arquivoRestauracaoFavoritos = new File([JSON.stringify(restauracaoFavoritos)], 'favoritos-fixture.json', { type: 'application/json' });
    const transferenciaFavoritos = new DataTransfer();
    transferenciaFavoritos.items.add(arquivoRestauracaoFavoritos);
    arquivoFavoritos.files = transferenciaFavoritos.files;
    arquivoFavoritos.dispatchEvent(new Event('change', { bubbles: true }));
    await esperarOrganizacao(() => favoritaDoNumero(1).getAttribute('aria-pressed') === 'false' && favoritaDoNumero(2).getAttribute('aria-pressed') === 'true', 'restaurar backup dos favoritos');
    if (!document.getElementById('resumo-favoritos-locais').textContent.includes('1 favorito guardado')) {
      throw new Error('restauração não atualizou o resumo local dos favoritos');
    }

    const campoColecao = document.getElementById('nome-nova-colecao');
    const criarColecao = document.getElementById('btn-criar-colecao');
    const seletorColecao = document.getElementById('seletor-colecao');
    const filtroColecao = document.getElementById('btn-filtrar-colecao');
    const botaoColecaoAtual = () => document.querySelector('#lista .conv-conversa[data-conversa-numero="1"] .conv-colecao');
    if (!campoColecao || !criarColecao || !seletorColecao || !filtroColecao || !botaoColecaoAtual()) {
      throw new Error('controles de coleções locais ausentes');
    }
    await esperarColecoes(() => !criarColecao.disabled, 'coleções locais prontas');
    campoColecao.value = 'Coleção de fixture';
    criarColecao.click();
    await esperarColecoes(() => [...seletorColecao.options].some(opcao => opcao.textContent.includes('Coleção de fixture')), 'criar coleção');
    const opcaoColecao = [...seletorColecao.options].find(opcao => opcao.textContent.includes('Coleção de fixture'));
    seletorColecao.value = opcaoColecao.value;
    seletorColecao.dispatchEvent(new Event('change', { bubbles: true }));
    await esperarColecoes(() => {
      const botao = botaoColecaoAtual();
      return !!botao && !botao.disabled;
    }, 'escolher coleção');
    botaoColecaoAtual().click();
    await esperarColecoes(() => document.querySelector('#lista .conv-conversa[data-conversa-numero="1"] .conv-colecao').getAttribute('aria-pressed') === 'true', 'associar conversa');
    filtroColecao.click();
    await esperar(() => filtroColecao.getAttribute('aria-pressed') === 'true', 5000, 'ativar filtro de coleção');
    const visiveisColecao = [...document.querySelectorAll('#lista .conv-conversa')].filter(visivel);
    if (visiveisColecao.length !== 1 || !visiveisColecao[0].textContent.includes('Página um 1')) {
      throw new Error('filtro local não isolou a conversa da coleção');
    }
    if (!visivel(document.getElementById('card-mais'))) throw new Error('carregar mais sumiu no filtro de coleção');
    filtroColecao.click();
    await esperar(() => filtroColecao.getAttribute('aria-pressed') === 'false', 5000, 'desativar filtro de coleção');

    const exportarColecoes = document.getElementById('btn-exportar-colecoes');
    const importarColecoes = document.getElementById('btn-importar-colecoes');
    const arquivoColecoes = document.getElementById('arq-importar-colecoes');
    if (!exportarColecoes || !importarColecoes || !arquivoColecoes) throw new Error('controles de backup das coleções ausentes');
    await esperarColecoes(() => !exportarColecoes.disabled && !importarColecoes.disabled, 'backup das coleções pronto');
    exportarColecoes.click();
    await esperarColecoes(() => window.__blobsBackupsLocais.length === 2, 'exportar backup das coleções');
    const exportado = JSON.parse(await window.__blobsBackupsLocais[1].text());
    if (exportado.formato !== 'rebocl-colecoes-conversas' || exportado.versao !== 1 || exportado.colecoes.length !== 1 || exportado.colecoes[0].nome !== 'Coleção de fixture' || String(exportado.colecoes[0].numeros) !== '1') {
      throw new Error('backup das coleções não preservou somente a associação local controlada');
    }
    const restauracao = {
      formato: 'rebocl-colecoes-conversas', versao: 1,
      colecoes: [{ nome: 'Coleção restaurada de fixture', numeros: [2, 7] }]
    };
    const arquivoRestauracao = new File([JSON.stringify(restauracao)], 'colecoes-fixture.json', { type: 'application/json' });
    const transferencia = new DataTransfer();
    transferencia.items.add(arquivoRestauracao);
    arquivoColecoes.files = transferencia.files;
    arquivoColecoes.dispatchEvent(new Event('change', { bubbles: true }));
    await esperarColecoes(() => [...seletorColecao.options].some(opcao => opcao.textContent.includes('Coleção restaurada de fixture')), 'restaurar backup das coleções');
    if ([...seletorColecao.options].some(opcao => opcao.textContent.includes('Coleção de fixture'))) {
      throw new Error('restauração não substituiu as coleções locais anteriores');
    }
    if (!document.getElementById('resumo-colecoes-locais').textContent.includes('1 coleção e 2 associações')) {
      throw new Error('restauração não atualizou o resumo local das coleções');
    }

    const busca = document.getElementById('busca');
    busca.value = 'agulha pesquisável';
    busca.dispatchEvent(new Event('input', { bubbles: true }));
    aplicarFiltroLista();

    const primeiroMais = document.getElementById('card-mais');
    const nova = document.getElementById('card-nova');
    if (!visivel(primeiroMais)) throw new Error('carregar mais ficou oculto na busca');
    if (visivel(nova)) throw new Error('nova conversa ficou visível na busca');

    primeiroMais.click();
    await esperar(() => document.querySelectorAll('#lista .conv').length >= 101, 5000, 'segunda página da lista');
    const segundoMais = document.getElementById('card-mais');
    if (!visivel(segundoMais)) throw new Error('segundo carregar mais ficou oculto na busca');

    segundoMais.click();
    await esperar(() => document.querySelector('#lista').textContent.includes('Agulha pesquisável'), 5000, 'terceira página pesquisável');
    const alvo = [...document.querySelectorAll('#lista .conv')]
      .find(elemento => elemento.textContent.includes('Agulha pesquisável'));
    if (!visivel(alvo)) throw new Error('resultado da página 3 não ficou visível');

    const avisoPwa = document.getElementById('aviso-atualizacao');
    const botaoPwa = document.getElementById('btn-aplicar-atualizacao');
    const entrada = document.getElementById('entrada');
    if (!visivel(avisoPwa) || !botaoPwa) throw new Error('aviso de atualização controlada ausente');
    entrada.value = 'rascunho de fixture';
    entrada.dispatchEvent(new Event('input', { bubbles: true }));
    if (!botaoPwa.disabled) throw new Error('atualização aceitou recarregar com rascunho');
    entrada.value = '';
    entrada.dispatchEvent(new Event('input', { bubbles: true }));
    if (botaoPwa.disabled) throw new Error('atualização ficou bloqueada sem escrita ou rascunho');
    botaoPwa.click();
    if (document.documentElement.dataset.pwaUpdateRequest !== 'REBOCL_ATIVAR_ATUALIZACAO') throw new Error('atualização explícita não pediu ativação ao worker controlado');

    document.getElementById('btn-config').click();
    const optin = document.getElementById('optin-rascunhos');
    optin.checked = true;
    optin.dispatchEvent(new Event('change', { bubbles: true }));
    entrada.value = 'rascunho local controlado';
    entrada.dispatchEvent(new Event('input', { bubbles: true }));
    await esperar(() => rascunhoLocalAtual() && rascunhoLocalAtual().texto === 'rascunho local controlado', 5000, 'rascunho local');
    entrada.value = '';
    atualizarAvisoRascunho();
    const avisoRascunho = document.getElementById('aviso-rascunho');
    if (!visivel(avisoRascunho)) throw new Error('rascunho local não ofereceu restauração explícita');
    document.getElementById('btn-restaurar-rascunho').click();
    if (entrada.value !== 'rascunho local controlado') throw new Error('restauração local não devolveu o texto exato');

    const apagarFavoritos = document.getElementById('btn-apagar-favoritos');
    apagarFavoritos.click();
    await esperarOrganizacao(() => document.getElementById('resumo-favoritos-locais').textContent.includes('0 favoritos guardados'), 'limpar favoritos');
    if (document.querySelector('#lista .conv-conversa[data-conversa-numero="1"] .conv-favorita').getAttribute('aria-pressed') !== 'false' || document.querySelector('#lista .conv-conversa[data-conversa-numero="2"] .conv-favorita').getAttribute('aria-pressed') !== 'false') {
      throw new Error('limpeza explícita não removeu favorito local');
    }
    const apagarColecoes = document.getElementById('btn-apagar-colecoes');
    apagarColecoes.click();
    await esperarColecoes(() => document.getElementById('resumo-colecoes-locais').textContent.includes('Nenhuma coleção local criada'), 'limpar coleções');
    if (seletorColecao.value || [...seletorColecao.options].some(opcao => opcao.textContent.includes('Coleção de fixture'))) {
      throw new Error('limpeza explícita não removeu coleção local');
    }

    const resultadoWorkspace = await testarWorkspace();
    document.body.dataset.browserE2e = 'PASS: favoritos locais marcaram, filtraram e apagaram sem rede; backup local dos favoritos exportou e restaurou substituindo a fixture sem rede; coleções locais criaram, associaram, filtraram e apagaram sem rede; backup local das coleções exportou e restaurou substituindo a fixture sem rede; busca ativa manteve carregar mais; nova conversa oculta; alvo da página 3 visível; PWA protegeu rascunho; rascunho local opt-in restaurou sem rede' + resultadoWorkspace;
  } catch (erro) {
    document.body.dataset.browserE2e = 'FAIL: ' + String((erro && erro.message) || erro).slice(0, 180);
  }
})();
</script>"""
teste_limpar = """<script>
try {
  const texto = document.body.textContent || '';
  if (new URL(location.href).searchParams.has('t')) throw new Error('parâmetro t permaneceu na URL');
  if (!texto.includes('Cache limpo.')) throw new Error('aviso de limpeza não apareceu');
  if (!texto.includes('Tokens nunca são aceitos por link.')) throw new Error('guarda de token por link não apareceu');
  document.body.dataset.browserE2e = 'PASS: rota limpar removeu t da URL e mostrou a guarda de token';
} catch (erro) {
  document.body.dataset.browserE2e = 'FAIL: ' + String((erro && erro.message) || erro).slice(0, 180);
}
</script>"""

# A única alteração em cada cópia temporária redireciona a API para o servidor local.
for pagina in paginas:
    conteudo = pagina.read_text()
    assert "const API = 'https://api.github.com';" in conteudo, pagina
    conteudo = conteudo.replace("const API = 'https://api.github.com';", "const API = location.origin;", 1)
    conteudo = conteudo.replace('<head>', '<head>' + preparo, 1)
    teste = teste_limpar if pagina.name == 'limpar.html' else teste_lista
    conteudo = conteudo.replace('</body>', teste + '</body>', 1)
    pagina.write_text(conteudo)
PY

cat > "$trabalho/servidor.js" <<'NODE'
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const raiz = process.env.FIXTURE_ROOT;
const porta = Number(process.env.FIXTURE_PORT);
const issue = (number, title) => ({
  number, title, comments: 0, labels: [], updated_at: '2026-10-18T00:00:00Z'
});
const pagina = (numero) => {
  if (numero === 1) return Array.from({ length: 50 }, (_, i) => issue(i + 1, `Página um ${i + 1}`));
  if (numero === 2) {
    return [issue(1, 'Duplicada deslocada')]
      .concat(Array.from({ length: 49 }, (_, i) => issue(i + 51, `Página dois ${i + 51}`)));
  }
  if (numero === 3) return [issue(100, 'Agulha pesquisável')];
  return [];
};
const responderJson = (resposta, dado) => {
  resposta.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  resposta.end(JSON.stringify(dado));
};
http.createServer((requisicao, resposta) => {
  const url = new URL(requisicao.url, `http://127.0.0.1:${porta}`);
  if (url.pathname === '/user') return responderJson(resposta, { login: 'fixture-controlada' });
  if (url.pathname === '/repos/reboclbrank-max/agente') return responderJson(resposta, { full_name: 'fixture/controlada' });
  if (url.pathname === '/repos/reboclbrank-max/agente/issues') {
    return responderJson(resposta, pagina(Number(url.searchParams.get('page') || 1)));
  }
  const arquivo = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const html = new Set(['index.html', 'direto.html', 'ligar.html', 'limpar.html']);
  const estaticos = new Map([
    ['chat-estilos.css', 'text/css; charset=utf-8'],
    ['chat-pwa.js', 'application/javascript; charset=utf-8'],
    ['chat-comandos-locais.js', 'application/javascript; charset=utf-8'],
    ['chat-filtro-chips.js', 'application/javascript; charset=utf-8'],
    ['chat-organizacao-local.js', 'application/javascript; charset=utf-8'],
    ['chat-colecoes-local.js', 'application/javascript; charset=utf-8'],
    ['chat-workspace.js', 'application/javascript; charset=utf-8'],
    ['dna.json', 'application/json; charset=utf-8']
  ]);
  if (html.has(arquivo) || estaticos.has(arquivo)) {
    const tipo = html.has(arquivo) ? 'text/html; charset=utf-8' : estaticos.get(arquivo);
    resposta.writeHead(200, { 'content-type': tipo, 'cache-control': 'no-store' });
    return fs.createReadStream(path.join(raiz, arquivo)).pipe(resposta);
  }
  resposta.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  resposta.end('fixture sem recurso externo');
}).listen(porta, '127.0.0.1', () => console.log(`fixture pronta ${porta}`));
NODE

FIXTURE_ROOT="$trabalho" FIXTURE_PORT="$porta" node "$trabalho/servidor.js" >"$trabalho/servidor.log" 2>&1 &
servidor_pid=$!
for _ in $(seq 1 30); do
  grep -q 'fixture pronta' "$trabalho/servidor.log" && break
  sleep 0.1
done
grep -q 'fixture pronta' "$trabalho/servidor.log" || { cat "$trabalho/servidor.log" >&2; exit 1; }

# Primeiro roda a regressão completa das quatro rotas no perfil padrão do navegador.
# O ciclo de armazenamento do Workspace usa IndexedDB real; o orçamento é virtual,
# e o timeout externo mantém a execução física curta e limitada.
for rota in "${rotas[@]}"; do
  nome="${rota%.html}"
  dom="$trabalho/dom-$nome.html"
  erro="$trabalho/navegador-$nome.err"
  orcamento=25000000
  url="http://127.0.0.1:$porta/$rota"
  if [ "$rota" = 'limpar.html' ]; then
    # A rota intencionalmente redireciona após 3 s; observamos sua guarda antes disso.
    orcamento=2000
    url="$url?t=controle-ficticio"
  fi
  timeout 60 "$navegador" \
    --headless --no-sandbox --disable-gpu --no-first-run --disable-background-networking --disable-sync \
    --host-resolver-rules='MAP * 0.0.0.0, EXCLUDE 127.0.0.1' \
    --user-data-dir="$trabalho/perfil-$nome" --virtual-time-budget="$orcamento" --dump-dom \
    "$url" > "$dom" 2>"$erro"

  if grep -Eq 'INFO:CONSOLE.*(Uncaught|Error)' "$erro"; then
    echo "ERRO: exceção JavaScript na fixture $rota" >&2
    grep 'INFO:CONSOLE' "$erro" >&2 || true
    exit 1
  fi
  python3 - "$dom" "$rota" <<'PY'
from pathlib import Path
import html
import re
import sys

conteudo = Path(sys.argv[1]).read_text()
rota = sys.argv[2]
resultado = re.search(r'data-browser-e2e="([^"]*)"', conteudo)
assert resultado, f'{rota}: resultado do navegador ausente'
texto = html.unescape(resultado.group(1))
assert texto.startswith('PASS:'), f'{rota}: {texto}'
if rota != 'limpar.html':
    assert 'Agulha pesquisável' in conteudo, f'{rota}: cartão alvo não está no DOM final'
else:
    assert 'Cache limpo.' in conteudo, f'{rota}: aviso de limpeza não está no DOM final'
if rota == 'index.html':
    assert 'Workspace criou, versionou, protegeu rascunho, criação/renomeação e lixeira em conflito local, buscou entre projetos sem expor Lixeira, transferiu projeto portátil com nome isolado, recuperou e rejeitou/cancelou/arquivou/restaurou/desfez arquivo, versão e lixeira somente na fixture' in texto, f'{rota}: ciclo Workspace não foi concluído'
print('✔ navegador controlado · padrão · ' + rota + ' · ' + texto)
PY
done

# Uma segunda passagem limitada abre a casca do Workspace em desktop e celular,
# mede as colunas já aplicadas pelo navegador e captura somente a fixture sintética.
for viewport in desktop mobile; do
  janela='1280,900'
  if [ "$viewport" = 'mobile' ]; then janela='390,844'; fi
  dom="$trabalho/dom-layout-$viewport.html"
  captura="$trabalho/captura-layout-$viewport.png"
  erro="$trabalho/navegador-layout-$viewport.err"
  url="http://127.0.0.1:$porta/index.html?viewport=$viewport&somente-layout=1"
  timeout 60 "$navegador" \
    --headless --no-sandbox --disable-gpu --no-first-run --disable-background-networking --disable-sync \
    --host-resolver-rules='MAP * 0.0.0.0, EXCLUDE 127.0.0.1' \
    --window-size="$janela" --force-device-scale-factor=1 --hide-scrollbars \
    --user-data-dir="$trabalho/perfil-layout-$viewport" --virtual-time-budget=25000000 --dump-dom --screenshot="$captura" \
    "$url" > "$dom" 2>"$erro"

  if grep -Eq 'INFO:CONSOLE.*(Uncaught|Error)' "$erro"; then
    echo "ERRO: exceção JavaScript na fixture de layout $viewport" >&2
    grep 'INFO:CONSOLE' "$erro" >&2 || true
    exit 1
  fi
  python3 - "$captura" "$viewport" <<'PY'
from pathlib import Path
import struct
import sys

png = Path(sys.argv[1]).read_bytes()
assert png[:8] == b'\x89PNG\r\n\x1a\n', 'captura PNG ausente ou inválida'
largura, altura = struct.unpack('>II', png[16:24])
assert largura >= 300 and altura >= 300, f'captura pequena demais: {largura}x{altura}'
if sys.argv[2] == 'mobile':
    assert largura <= 500, f'viewport estreito não foi aplicado: {largura}px'
PY
  python3 - "$dom" "$viewport" <<'PY'
from pathlib import Path
import html
import re
import sys

conteudo = Path(sys.argv[1]).read_text()
viewport = sys.argv[2]
resultado = re.search(r'data-browser-e2e="([^"]*)"', conteudo)
assert resultado, f'layout {viewport}: resultado do navegador ausente'
texto = html.unescape(resultado.group(1))
assert texto.startswith('PASS:'), f'layout {viewport}: {texto}'
assert ('Workspace abriu com a casca local e o layout ' + viewport + ' controlado') in texto, f'layout {viewport}: Workspace não foi validado'
print('✔ navegador controlado · layout ' + viewport + ' · ' + texto)
PY
done
