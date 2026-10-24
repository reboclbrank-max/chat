// 🚦 TESTES RÁPIDOS DO CHAT (16/10/2026) — a barreira antes de o código novo entrar no ar: o workflow testes-rapidos.yml
// roda isto a cada mudança de código, e o escutador (v4.3) só troca o turno se passar. Sem Gmail e sem IA de verdade:
// IMAP, SMTP e motores falsos (simula-caixa.js). Sai com código 1 se algo falhar.
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { comandoExecutavelDisponivel } = require('./pre-requisitos');
const T = path.resolve(__dirname, '..');
const CHAT = path.join(T, 'email-chat.js');
let total = 0, falhas = 0, ignorados = 0;
function registra(nome, ok, detalhe, ignorado = false) {
  if (ignorado) { ignorados++; console.log('○ ' + nome + ' → ' + detalhe); return; }
  total++; if (!ok) falhas++; console.log((ok ? '✔ ' : '✘ ') + nome + (ok ? '' : ' → ' + detalhe));
}
for (const u of ['mime-bateria.js', 'formato-e-trava.js', 'autenticidade-planilha.js', 'lembretes.js', 'telegram.js', 'conta-e-comandos.js', 'comandos-locais-interface.js', 'central-operacional.js', 'preparo-controlado.js', 'dossie-preparo-controlado.js', 'reforco-dossie-controlado.js', 'filtro-chips-interface.js', 'organizacao-conversas-local.js', 'colecoes-conversas-local.js', 'workspace-local.js', 'workspace-integridade-local.js', 'workspace-arquivo-completo.js', 'workspace-arquivo-completo-concorrencia-local.js', 'workspace-projeto-portatil.js', 'workspace-busca-global.js', 'workspace-conflito-local.js', 'workspace-lixeira-concorrencia-local.js', 'seguranca-interface.js', 'markdown-imagem-privacidade.js', 'interface-seguranca-fluxo.js', 'acessibilidade-interface.js', 'estilos-compartilhados.js', 'pwa-atualizacao-segura.js', 'limites-conteudo-interface.js', 'rascunhos-locais-interface.js', 'token-antes-rascunho-privacidade.js', 'contador-compositor-limpeza.js', 'leitura-e-inicio-interface.js', 'rede-e-modo-somente-local.js', 'inicializacao-rede-explicita.js', 'sugestoes-locais-privacidade.js', 'varredura-privacidade.js', 'contexto-explicito-privacidade.js', 'memoria-profunda-privacidade.js', 'caderno-contexto-explicito.js', 'comandos-privados-locais.js', 'transformacoes-locais-privacidade.js', 'calculadoras-locais-privacidade.js', 'sorteios-locais-privacidade.js', 'rotinas-locais-privacidade.js', 'sessoes-locais-privacidade.js', 'paineis-locais-privacidade.js', 'referencias-estaticas-privacidade.js', 'estados-entrega-e-falhas.js', 'fallback-trabalhador.js', 'paginacao-conversas.js', 'navegador-lista-controlado-estatico.js', 'diagnostico-motores.js', 'navegador-publico.js', 'navegador-retorno.js', 'navegador-retorno-fluxo.js', 'navegador-comando-email.js', 'teste-navegador-pareado.js', 'geografia-brasil.js', 'vigia-estado.js', 'estado-operacional-controlado.js', 'auditoria-workflows.js', 'teste-email-resultado.js', 'teste-email-remetentes.js', 'pulso-vigia.js', 'reserva-turno.js', 'email-poll-adocao.js', 'turno-liveness.js', 'falhas-operacionais.js', 'teste-foto-resiliencia.js', 'pre-requisitos-multimodais.js', 'ocr-local.js', 'visao-resposta-cega.js', 'vigia-casa-resiliencia.js', 'vigia-recuperacao-fluxo.js', 'evolucao-chat.js', 'avaliacao-profunda.js', 'indice-capacidade.js', 'inventario-estado-operacional.js', 'portabilidade-estatica.js', 'operacao-incidentes.js', 'continuidade.js']) {
  const r = spawnSync('node', [path.join(__dirname, u), CHAT], { encoding: 'utf8', timeout: 120000 });
  const ultima = String(r.stdout || '').trim().split('\n').pop();
  const ignorado = r.status === 0 && /^SKIP:/.test(ultima);
  registra('unidade · ' + u + ' (' + ultima + ')', r.status === 0 && !ignorado,
    ignorado ? ultima : (r.stdout + r.stderr).split('\n').filter(l => /✘|Error|erro/.test(l)).slice(0, 4).join(' | '), ignorado);
}
function cenario(nome, env, exigir, proibir, requisitos = []) {
  const ausentes = requisitos.filter((nomeComando) => !comandoExecutavelDisponivel(nomeComando));
  if (ausentes.length) {
    const detalhe = 'pré-requisito local ausente: ' + ausentes.join(', ');
    if (process.env.REBOCL_EXIGIR_MULTIMODAL === '1') registra('cenário · ' + nome, false, detalhe + ' (a barreira marcou multimodal como obrigatório)');
    else registra('cenário · ' + nome, false, 'SKIP: ' + detalhe, true);
    return;
  }
  fs.rmSync(path.join(os.tmpdir(), 'sim-caixa'), { recursive: true, force: true });
  const r = spawnSync('node', [path.join(__dirname, 'simula-caixa.js'), CHAT], { encoding: 'utf8', timeout: 300000, env: Object.assign({}, process.env, { VISAO_MODELO: 'inventado', VISAO_CACHE: path.join(os.tmpdir(), 'visao-ci') }, env) });
  const saida = String(r.stdout || '') + String(r.stderr || '');
  const faltou = (exigir || []).filter(re => !re.test(saida)).map(String);
  const sobrou = (proibir || []).filter(re => re.test(saida)).map(String);
  registra('cenário · ' + nome, r.status === 0 && !faltou.length && !sobrou.length, 'código ' + r.status + (faltou.length ? ' · faltou ' + faltou.join(', ') : '') + (sobrou.length ? ' · não devia ter ' + sobrou.join(', ') : ''));
}
const D = { CHAT_DONO: 'dono@exemplo.com' };
cenario('texto + e-mail problemático não trava a fila', D, [/respondeu 4 →/, /ainda não lidos: \[205\]/, /com HTML: 4\/4/]);
cenario('Gmail com foto: a pergunta do corpo chega à visão', Object.assign({ SIMULA_FORMATO: 'gmail', SIMULA_FOTO: path.join(T, 'teste-visao3.png'), SIMULA_FOTO_ASSUNTO: 'foto do quintal', SIMULA_PERGUNTA: 'Responda PIMENTA e diga a data escrita na imagem.' }, D), [/chegou ao motor de visão: SIM/], [/chegou ao motor de visão: NÃO/]);
cenario('3 fotos viram montagem numerada', Object.assign({ SIMULA_FOTO: path.join(T, 'teste-visao3.png'), SIMULA_FOTOS: ['teste-visao3.png', 'foto-bilhete.png', 'foto-horta.jpg'].map(f => path.join(T, f)).join(','), SIMULA_FOTO_ASSUNTO: 'tres fotos' }, D), [/montagem de 3 fotos/, /Foto 1:/]);
cenario('remetente não autorizado: resposta curta, sem IA', { CHAT_DONO: 'outro@exemplo.com' }, [/remetente não autorizado/, /já avisado 3 vezes/], [/respondido via/]);
cenario('memória pela conversa do Gmail', Object.assign({ SIMULA_CONVERSA: '1' }, D), [/memória: 2 mensagem/, /JATOBÁ/]);
cenario('rede de segurança devolve o perdido; robô não é respondido', Object.assign({ SIMULA_PERDIDO: '1', SIMULA_AUTOMATICO: '1', CHAT_AUDITORIA_SEG: '0' }, D), [/devolvidos à fila \(uid 600\)/, /não respondo robô/]);
cenario('sem visão: o PDF é respondido e a foto declarada não vista', Object.assign({ SIMULA_PDF: path.join(T, 'anexo-prova.pdf'), SIMULA_FOTO: path.join(T, 'teste-visao3.png'), SIMULA_FOTO_ASSUNTO: '[TESTE-REBOCL] R3-16 foto + PDF sem visão [SEM-VISAO]' }, D), [/foto não vista, mas o texto/, /12 pés de couve/], [], ['pdftotext']);
cenario('motores de texto fora: cérebro local tenta e a fila não trava', Object.assign({ SIMULA_TEXTO_FORA: '1' }, D), [/cérebro local não respondeu/, /respondeu 4 →/]);
console.log('\n' + (total - falhas) + '/' + total + ' testes rápidos executados passaram' + (ignorados ? ' · ' + ignorados + ' ignorado(s) por pré-requisito local ausente' : ''));
process.exitCode = falhas ? 1 : 0;
