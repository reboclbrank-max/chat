#!/usr/bin/env node
'use strict';
/*
 * Estado operacional controlado
 *
 * As automações de manutenção nunca promovem saída em main. Elas podem somente
 * ler e publicar os artefatos sanitizados e literais de cada perfil em
 * refs/heads/estado/operacional. O ramo é revisável, não é canal de deploy e
 * não recebe fonte, workflow ou caminho arbitrário.
 *
 * Uso fechado:
 *   node tools/estado-operacional-controlado.js preparar <perfil>
 *   node tools/estado-operacional-controlado.js atualizar-vigia evolucao
 *   node tools/estado-operacional-controlado.js publicar <perfil>
 */
const child = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RAMO = 'estado/operacional';
const REF_REMOTA = 'origin/' + RAMO;
const PERFIS = Object.freeze({
  email: Object.freeze({
    le: ['email-log.md'],
    escreve: ['email-log.md'],
    mensagem: 'estado operacional: log de e-mail',
    concatenaLog: true
  }),
  evolucao: Object.freeze({
    le: ['vigia-estado.json', 'saude-cerebro.md', 'qualidade-historico.json', 'capacidade-estado.json', 'CAPACIDADE.md'],
    escreve: ['saude-cerebro.md', 'qualidade-historico.json', 'capacidade-estado.json', 'CAPACIDADE.md'],
    mensagem: 'estado operacional: indicador diário'
  }),
  vigia: Object.freeze({
    le: ['vigia-estado.json'],
    escreve: ['vigia-estado.json'],
    mensagem: 'estado operacional: vigia'
  }),
  ferramentas: Object.freeze({
    le: [],
    escreve: [],
    prova: /^provas\/ferramentas-\d{4}-\d\d-\d\d-\d{4}\.md$/,
    mensagem: 'estado operacional: exame das ferramentas'
  }),
  coleta: Object.freeze({
    le: [],
    escreve: [],
    prova: /^provas\/teste-email-final-\d{4}-\d\d-\d\d-\d{4}\.md$/,
    mensagem: 'estado operacional: coleta de e-mail'
  }),
  'teste-email': Object.freeze({
    le: [],
    escreve: [],
    // Os sete scripts já fechados no workflow geram somente estes relatórios
    // Markdown e os dois MP3 literais de voz; não há wildcard de caminho.
    prova: /^(?:provas\/(?:teste-email-r3|avaliacao-profunda|teste-memoria|teste-foto|teste-voz|teste-anexos)-\d{4}-\d\d-\d\d-\d{4}\.md|provas\/teste-navegador-pareado-\d{4}-\d\d-\d\d-\d\d-\d\d\.md|provas\/voz-resposta-v[12]\.mp3)$/,
    mensagem: 'estado operacional: relatório de teste de e-mail'
  })
});

function falha(mensagem) {
  throw new Error('estado operacional controlado: ' + mensagem);
}
function execGit(args, opcoes = {}) {
  const r = child.spawnSync('git', args, {
    cwd: opcoes.cwd || process.cwd(),
    encoding: null,
    env: process.env,
    maxBuffer: 16 * 1024 * 1024
  });
  if (r.error) falha('não consegui executar git (' + args[0] + ')');
  if (r.status !== 0 && !opcoes.podeFalhar) {
    // Não repassa stderr: hooks/remotos podem conter texto não confiável e não é
    // necessário para tomar a decisão fechada de parar.
    falha('git ' + args[0] + ' recusou a operação segura');
  }
  return r;
}
function textoGit(args, opcoes) { return execGit(args, opcoes).stdout.toString('utf8').trim(); }
function raiz() { return textoGit(['rev-parse', '--show-toplevel']); }
function diretorioGit() {
  const bruto = textoGit(['rev-parse', '--git-dir']);
  return path.resolve(raiz(), bruto);
}
function perfil(nome) {
  if (!Object.prototype.hasOwnProperty.call(PERFIS, nome)) falha('perfil fora da allowlist');
  return PERFIS[nome];
}
function chaveArquivo(nome) { return crypto.createHash('sha256').update(nome).digest('hex'); }
function caminhoSeguro(relativo) {
  if (typeof relativo !== 'string' || !relativo || relativo.includes('\0') || relativo.includes('\\') || relativo.startsWith('/') || relativo.split('/').includes('..')) {
    return false;
  }
  return true;
}
function permitido(p, arquivo) {
  return arquivo.escreve.includes(p) || Boolean(arquivo.prova && arquivo.prova.test(p));
}
function entradaDaArvore(ref, arquivo) {
  const r = execGit(['ls-tree', '-z', ref, '--', arquivo]);
  if (!r.stdout.length) return null;
  const item = r.stdout.toString('utf8').split('\0')[0];
  const m = /^(\d+)\s+(\w+)\s+([0-9a-f]{40,64})\t(.+)$/.exec(item);
  if (!m || m[4] !== arquivo) falha('árvore remota com caminho inesperado');
  return { modo: m[1], tipo: m[2], hash: m[3] };
}
function entradaRegular(ref, arquivo, obrigatorio = false) {
  const e = entradaDaArvore(ref, arquivo);
  if (!e && obrigatorio) falha('artefato obrigatório ausente do ramo de estado: ' + arquivo);
  if (e && (e.tipo !== 'blob' || !/^100(?:644|755)$/.test(e.modo))) falha('artefato não regular recusado: ' + arquivo);
  return e;
}
function buscaRamoEstado() {
  const busca = execGit(['fetch', '-q', 'origin', 'refs/heads/' + RAMO + ':refs/remotes/origin/' + RAMO], { podeFalhar: true });
  if (busca.status !== 0) falha('ramo estado/operacional inexistente ou fetch recusado; não publico em main como alternativa');
  const r = execGit(['rev-parse', '--verify', '--quiet', REF_REMOTA], { podeFalhar: true });
  if (r.status !== 0) falha('ramo estado/operacional inexistente; não publico em main como alternativa');
  return textoGit(['rev-parse', REF_REMOTA]);
}
function registroDir(nome) { return path.join(diretorioGit(), 'estado-operacional-controlado', nome); }
function registroArquivo(nome) { return path.join(registroDir(nome), 'preparo.json'); }
function leRegistro(nome) {
  const arq = registroArquivo(nome);
  if (!fs.existsSync(arq)) return null;
  let dado;
  try { dado = JSON.parse(fs.readFileSync(arq, 'utf8')); } catch (_) { falha('registro local de preparo inválido'); }
  if (!dado || dado.versao !== 1 || dado.pronto !== true || dado.perfil !== nome || dado.ramo !== RAMO || typeof dado.bases !== 'object') falha('registro local de preparo inválido');
  return dado;
}
function escreveRegistro(nome, dado) {
  const dir = registroDir(nome);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'bases'), { recursive: true, mode: 0o700 });
  fs.writeFileSync(registroArquivo(nome), JSON.stringify(dado) + '\n', { mode: 0o600 });
}
function removeRegistro(nome) { fs.rmSync(registroDir(nome), { recursive: true, force: true }); }
function arquivoBase(nome, relativo) { return path.join(registroDir(nome), 'bases', chaveArquivo(relativo) + '.bin'); }
function confirmaArquivoDeTrabalho(relativo) {
  const absoluto = path.resolve(raiz(), relativo);
  if (!absoluto.startsWith(raiz() + path.sep)) falha('caminho fora da cópia de trabalho');
  if (!fs.existsSync(absoluto)) return null;
  const s = fs.lstatSync(absoluto);
  if (!s.isFile() || s.nlink !== 1) falha('symlink, hard link ou tipo de arquivo não regular recusado: ' + relativo);
  return absoluto;
}
function prepara(nome) {
  const p = perfil(nome);
  const remoto = buscaRamoEstado();
  const bases = {};
  for (const arquivo of p.le) {
    if (!caminhoSeguro(arquivo)) falha('allowlist interna inválida');
    const e = entradaRegular(REF_REMOTA, arquivo, true);
    bases[arquivo] = e.hash;
  }
  const registro = { versao: 1, pronto: false, perfil: nome, ramo: RAMO, remoto, bases };
  escreveRegistro(nome, registro);
  for (const arquivo of p.le) {
    // Não deixe o restore escrever sobre inode compartilhado ou link local.
    confirmaArquivoDeTrabalho(arquivo);
    // --worktree impede que a fotografia de estado seja automaticamente
    // encenada como alteração contra main; somente a saída declarada poderá ser
    // adicionada pelo passo seguinte do workflow.
    execGit(['restore', '--source=' + REF_REMOTA, '--worktree', '--', arquivo]);
    const absoluto = confirmaArquivoDeTrabalho(arquivo);
    if (!absoluto) falha('restauração do artefato não produziu arquivo: ' + arquivo);
    fs.copyFileSync(absoluto, arquivoBase(nome, arquivo));
  }
  registro.pronto = true;
  fs.writeFileSync(registroArquivo(nome), JSON.stringify(registro) + '\n', { mode: 0o600 });
  console.log('estado operacional preparado: ' + nome + ' (' + p.le.length + ' leitura(s) literal(is))');
}
function atualizaVigia(nome) {
  if (nome !== 'evolucao') falha('somente evolução pode atualizar a leitura do vigia');
  const registro = leRegistro(nome);
  if (!registro) falha('atualização do vigia exige preparo anterior');
  buscaRamoEstado();
  entradaRegular(REF_REMOTA, 'vigia-estado.json', true);
  confirmaArquivoDeTrabalho('vigia-estado.json');
  execGit(['restore', '--source=' + REF_REMOTA, '--worktree', '--', 'vigia-estado.json']);
  confirmaArquivoDeTrabalho('vigia-estado.json');
  console.log('vigia atualizado a partir do ramo de estado');
}
function caminhosEncenados() {
  const r = execGit(['diff', '--cached', '--name-only', '-z']);
  return r.stdout.toString('utf8').split('\0').filter(Boolean);
}
function modoNoIndice(arquivo) {
  const r = execGit(['ls-files', '-s', '--', arquivo]);
  const linha = r.stdout.toString('utf8').trim();
  const m = /^(\d+)\s+[0-9a-f]{40,64}\s+\d+\t/.exec(linha);
  return m ? m[1] : null;
}
function hashNoIndice(arquivo) {
  const r = execGit(['rev-parse', '--verify', '--quiet', ':' + arquivo], { podeFalhar: true });
  return r.status === 0 ? r.stdout.toString('utf8').trim() : null;
}
function hashDoRef(ref, arquivo) {
  const e = entradaRegular(ref, arquivo, false);
  return e ? e.hash : null;
}
function salvaSaidas(nome, p, caminhos, registro) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'estado-operacional-'));
  const saidas = [];
  try {
    for (const arquivo of caminhos) {
      if (!caminhoSeguro(arquivo) || !permitido(arquivo, p)) falha('caminho fora do perfil ' + nome + ': ' + arquivo);
      if (!confirmaArquivoDeTrabalho(arquivo)) falha('arquivo encenado ausente da cópia de trabalho: ' + arquivo);
      const modo = modoNoIndice(arquivo);
      if (!modo || !/^100(?:644|755)$/.test(modo)) falha('remoção, symlink ou modo não regular recusado: ' + arquivo);
      const destino = path.join(tmp, arquivo);
      if (!destino.startsWith(tmp + path.sep)) falha('destino temporário inválido');
      fs.mkdirSync(path.dirname(destino), { recursive: true, mode: 0o700 });
      const r = execGit(['show', ':' + arquivo]);
      fs.writeFileSync(destino, r.stdout, { mode: 0o600 });
      const baseDoPreparo = registro && Object.prototype.hasOwnProperty.call(registro.bases, arquivo)
        ? registro.bases[arquivo]
        : hashDoRef('HEAD', arquivo);
      saidas.push({ arquivo, destino, desejado: hashNoIndice(arquivo), base: baseDoPreparo || null });
    }
    return { tmp, saidas };
  } catch (e) {
    fs.rmSync(tmp, { recursive: true, force: true });
    throw e;
  }
}
function comecaCom(buffer, inicio) {
  return buffer.length >= inicio.length && buffer.subarray(0, inicio.length).equals(inicio);
}
function terminaCom(buffer, fim) {
  return buffer.length >= fim.length && buffer.subarray(buffer.length - fim.length).equals(fim);
}
function conteudoDoRef(ref, arquivo) { return execGit(['show', ref + ':' + arquivo]).stdout; }
function copiaParaArvore(arquivo, origem) {
  const destino = path.resolve(raiz(), arquivo);
  if (!destino.startsWith(raiz() + path.sep)) falha('destino fora da cópia de trabalho');
  if (fs.existsSync(destino)) {
    const s = fs.lstatSync(destino);
    if (!s.isFile() || s.nlink !== 1) falha('destino com symlink, hard link ou tipo não regular recusado: ' + arquivo);
  }
  fs.mkdirSync(path.dirname(destino), { recursive: true, mode: 0o755 });
  fs.copyFileSync(origem, destino);
  fs.chmodSync(destino, 0o644);
  execGit(['add', '--', arquivo]);
}
function sufixoAppendOnlyDoLog(nome, saida) {
  const base = arquivoBase(nome, saida.arquivo);
  if (!fs.existsSync(base)) falha('base de log ausente; não concateno sem prova de origem');
  const antigo = fs.readFileSync(base);
  const desejado = fs.readFileSync(saida.destino);
  if (!comecaCom(desejado, antigo)) falha('log de e-mail deixou de ser append-only; paro sem sobrescrever');
  return { antigo, sufixo: desejado.subarray(antigo.length) };
}
function integraLogEmail(nome, saida, atual) {
  const { sufixo } = sufixoAppendOnlyDoLog(nome, saida);
  if (!sufixo.length) return false;
  if (saida.base && !atual) falha('log remoto foi removido durante o turno; paro sem recriar');
  const corrente = atual ? conteudoDoRef(REF_REMOTA, saida.arquivo) : Buffer.alloc(0);
  if (terminaCom(corrente, sufixo)) return false;
  const destino = path.resolve(raiz(), saida.arquivo);
  if (fs.existsSync(destino)) {
    const s = fs.lstatSync(destino);
    if (!s.isFile() || s.nlink !== 1) falha('log remoto com symlink, hard link ou tipo não regular recusado');
  }
  fs.mkdirSync(path.dirname(destino), { recursive: true, mode: 0o755 });
  fs.writeFileSync(destino, Buffer.concat([corrente, sufixo]), { mode: 0o644 });
  execGit(['add', '--', saida.arquivo]);
  return true;
}
function exigeAutor() {
  const nome = textoGit(['config', '--get', 'user.name'], { podeFalhar: true });
  const email = textoGit(['config', '--get', 'user.email'], { podeFalhar: true });
  if (!nome || !email) falha('autor de commit ausente');
}
function publicar(nome) {
  const p = perfil(nome);
  const id = String(process.env.GITHUB_RUN_ID || '');
  if (!/^\d+$/.test(id)) falha('GITHUB_RUN_ID numérico é obrigatório');
  const caminhos = caminhosEncenados();
  if (!caminhos.length) {
    console.log('estado operacional: nenhuma saída encenada para ' + nome);
    return;
  }
  execGit(['diff', '--cached', '--check']);
  for (const arquivo of caminhos) {
    if (!caminhoSeguro(arquivo) || !permitido(arquivo, p)) falha('caminho fora do perfil ' + nome + ': ' + arquivo);
  }
  const exigePreparo = p.le.length > 0;
  const registro = leRegistro(nome);
  if (exigePreparo && !registro) falha('publicação exige o preparo literal deste perfil');
  if (registro && registro.remoto && !/^[0-9a-f]{40,64}$/.test(registro.remoto)) falha('registro local de preparo inválido');
  const salvo = salvaSaidas(nome, p, caminhos, registro);
  try {
    // Mesmo sem concorrência, o perfil de e-mail não pode reescrever ou
    // truncar o histórico que recebeu no preparo.
    if (p.concatenaLog) {
      for (const saida of salvo.saidas) if (saida.arquivo === 'email-log.md') sufixoAppendOnlyDoLog(nome, saida);
    }
    exigeAutor();
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      buscaRamoEstado();
      // Descarta somente a cópia efêmera depois de salvar os blobs permitidos;
      // HEAD fica destacado para nunca mover o ramo local de origem do checkout.
      execGit(['checkout', '--detach', '-q', '-f', REF_REMOTA]);
      execGit(['reset', '--hard', REF_REMOTA]);
      let mudou = false;
      for (const saida of salvo.saidas) {
        const atual = entradaRegular(REF_REMOTA, saida.arquivo, false);
        const hashAtual = atual ? atual.hash : null;
        if (hashAtual === saida.desejado) continue;
        if (hashAtual === saida.base) {
          copiaParaArvore(saida.arquivo, saida.destino);
          mudou = true;
          continue;
        }
        if (p.concatenaLog && saida.arquivo === 'email-log.md') {
          mudou = integraLogEmail(nome, saida, atual) || mudou;
          continue;
        }
        falha('artefato mudou no ramo de estado durante o turno: ' + saida.arquivo + '; não sobrescrevi');
      }
      if (!mudou || execGit(['diff', '--cached', '--quiet'], { podeFalhar: true }).status === 0) {
        removeRegistro(nome);
        console.log('estado operacional: saída já estava publicada ou não mudou');
        return;
      }
      execGit(['diff', '--cached', '--check']);
      execGit(['commit', '-m', p.mensagem + ' #' + id]);
      const push = execGit(['push', '-q', 'origin', 'HEAD:refs/heads/' + RAMO], { podeFalhar: true });
      if (push.status === 0) {
        removeRegistro(nome);
        console.log('estado operacional publicado: ' + textoGit(['rev-parse', 'HEAD']));
        return;
      }
      if (tentativa < 3) console.log('estado operacional concorreu; refaço somente contra a ponta remota (' + tentativa + '/3)');
    }
    falha('push do ramo de estado recusado após três tentativas; main permaneceu intacto');
  } finally {
    fs.rmSync(salvo.tmp, { recursive: true, force: true });
  }
}
function uso() {
  console.error('uso: node tools/estado-operacional-controlado.js preparar|atualizar-vigia|publicar <perfil fechado>');
  process.exitCode = 2;
}
try {
  const [acao, nome] = process.argv.slice(2);
  if (!acao || !nome || process.argv.length !== 4) uso();
  else if (acao === 'preparar') prepara(nome);
  else if (acao === 'atualizar-vigia') atualizaVigia(nome);
  else if (acao === 'publicar') publicar(nome);
  else uso();
} catch (e) {
  console.error('ERRO CONTROLADO: ' + (e && e.message ? e.message : 'falha desconhecida'));
  process.exitCode = 1;
}
