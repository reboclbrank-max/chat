// Contrato local do ramo de estado: nunca há push automático para main e conflito não sobrescreve fotografia sanitizada.
'use strict';
const assert = require('assert');
const child = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const FERRAMENTA = path.join(RAIZ, 'tools', 'estado-operacional-controlado.js');
let certos = 0;
let falhas = 0;
function teste(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
}
function roda(cwd, args) {
  const r = child.spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (r.error || r.status !== 0) throw new Error('git ' + args[0] + ' falhou');
  return String(r.stdout || '').trim();
}
function node(cwd, acao, perfil, id = '424242') {
  return child.spawnSync(process.execPath, [FERRAMENTA, acao, perfil], {
    cwd, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    env: Object.assign({}, process.env, { GITHUB_RUN_ID: id })
  });
}
function escreve(base, relativo, conteudo) {
  const alvo = path.join(base, relativo);
  fs.mkdirSync(path.dirname(alvo), { recursive: true });
  fs.writeFileSync(alvo, conteudo);
}
function leNoRemoto(remoto, ramo, relativo) {
  return roda(path.dirname(remoto), ['--git-dir=' + remoto, 'show', 'refs/heads/' + ramo + ':' + relativo]);
}
function hashNoRemoto(remoto, ramo) {
  return roda(path.dirname(remoto), ['--git-dir=' + remoto, 'rev-parse', 'refs/heads/' + ramo]);
}
function configuraAutor(repo, nome = 'teste') {
  roda(repo, ['config', 'user.name', nome]);
  roda(repo, ['config', 'user.email', nome + '@exemplo.invalid']);
}
function clona(remoto, destino) {
  roda(path.dirname(destino), ['clone', '-q', remoto, destino]);
  configuraAutor(destino);
}
function alteraEPublicaEstado(remoto, tmp, relativo, conteudo) {
  const outro = path.join(tmp, 'concorrente-' + Math.random().toString(16).slice(2));
  clona(remoto, outro);
  roda(outro, ['switch', '-q', 'estado/operacional']);
  escreve(outro, relativo, conteudo);
  roda(outro, ['add', '--', relativo]);
  roda(outro, ['commit', '-qm', 'estado concorrente']);
  roda(outro, ['push', '-q', 'origin', 'HEAD:estado/operacional']);
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'teste-estado-operacional-'));
try {
  const remoto = path.join(temp, 'remoto.git');
  const origem = path.join(temp, 'origem');
  roda(temp, ['init', '--bare', '-q', remoto]);
  roda(temp, ['init', '-q', origem]);
  configuraAutor(origem, 'origem');
  escreve(origem, 'vigia-estado.json', '{"estado":"main"}\n');
  escreve(origem, 'email-log.md', '# log\n');
  escreve(origem, 'saude-cerebro.md', '# saúde\n');
  escreve(origem, 'qualidade-historico.json', '[]\n');
  escreve(origem, 'capacidade-estado.json', '{}\n');
  escreve(origem, 'CAPACIDADE.md', '# capacidade\n');
  escreve(origem, 'tools/fonte-imutavel.js', 'module.exports = "main";\n');
  roda(origem, ['add', '.']);
  roda(origem, ['commit', '-qm', 'base principal']);
  roda(origem, ['branch', '-M', 'main']);
  roda(origem, ['remote', 'add', 'origin', remoto]);
  roda(origem, ['push', '-qu', 'origin', 'main']);
  roda(temp, ['--git-dir=' + remoto, 'symbolic-ref', 'HEAD', 'refs/heads/main']);

  teste('ramo de estado ausente falha fechado sem usar main como alternativa', () => {
    const semEstado = path.join(temp, 'sem-estado');
    clona(remoto, semEstado);
    const antes = hashNoRemoto(remoto, 'main');
    const r = node(semEstado, 'preparar', 'vigia');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /fetch recusado|ramo estado\/operacional inexistente/);
    assert.equal(hashNoRemoto(remoto, 'main'), antes);
  });

  roda(origem, ['push', '-q', 'origin', 'HEAD:estado/operacional']);

  // A fotografia do ramo de estado diverge da fonte para provar que preparar
  // lê a referência revisável sem encenar essa troca contra main.
  alteraEPublicaEstado(remoto, temp, 'vigia-estado.json', '{"estado":"fotografia"}\n');
  const trabalho = path.join(temp, 'trabalho');
  clona(remoto, trabalho);

  teste('preparar lê estado do ramo isolado sem encenar mudança contra main', () => {
    const r = node(trabalho, 'preparar', 'vigia');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(fs.readFileSync(path.join(trabalho, 'vigia-estado.json'), 'utf8'), '{"estado":"fotografia"}\n');
    assert.equal(roda(trabalho, ['diff', '--cached', '--name-only']), '');
  });

  teste('publicar vigia altera somente estado/operacional e preserva main', () => {
    escreve(trabalho, 'vigia-estado.json', '{"estado":"publicado"}\n');
    roda(trabalho, ['add', '--', 'vigia-estado.json']);
    const r = node(trabalho, 'publicar', 'vigia');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(leNoRemoto(remoto, 'main', 'vigia-estado.json'), '{"estado":"main"}');
    assert.equal(leNoRemoto(remoto, 'estado/operacional', 'vigia-estado.json'), '{"estado":"publicado"}');
    assert.equal(leNoRemoto(remoto, 'estado/operacional', 'tools/fonte-imutavel.js'), 'module.exports = "main";');
  });

  teste('teste de e-mail publica somente relatório de nome literal no ramo de estado', () => {
    roda(trabalho, ['switch', '-q', 'main']);
    roda(trabalho, ['reset', '--hard', '-q', 'origin/main']);
    escreve(trabalho, 'provas/teste-email-r3-2026-10-22-1234.md', '# relatório controlado\n');
    roda(trabalho, ['add', '--', 'provas/teste-email-r3-2026-10-22-1234.md']);
    const r = node(trabalho, 'publicar', 'teste-email', '424245');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(leNoRemoto(remoto, 'estado/operacional', 'provas/teste-email-r3-2026-10-22-1234.md'), '# relatório controlado');
    assert.throws(() => leNoRemoto(remoto, 'main', 'provas/teste-email-r3-2026-10-22-1234.md'));
  });

  teste('teste de e-mail rejeita nome de prova fora da allowlist', () => {
    roda(trabalho, ['switch', '-q', 'main']);
    roda(trabalho, ['reset', '--hard', '-q', 'origin/main']);
    escreve(trabalho, 'provas/relatorio-livre.md', '# não permitido\n');
    roda(trabalho, ['add', '--', 'provas/relatorio-livre.md']);
    const antes = hashNoRemoto(remoto, 'estado/operacional');
    const r = node(trabalho, 'publicar', 'teste-email', '424246');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /fora do perfil/);
    assert.equal(hashNoRemoto(remoto, 'estado/operacional'), antes);
    roda(trabalho, ['reset', '--hard', '-q']);
  });

  teste('perfil fechado rejeita arquivo fora da saída autorizada antes de qualquer push', () => {
    roda(trabalho, ['switch', '-q', 'main']);
    roda(trabalho, ['reset', '--hard', '-q', 'origin/main']);
    escreve(trabalho, 'fora.txt', 'não pode publicar\n');
    roda(trabalho, ['add', '--', 'fora.txt']);
    const antes = hashNoRemoto(remoto, 'estado/operacional');
    const r = node(trabalho, 'publicar', 'vigia');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /fora do perfil/);
    assert.equal(hashNoRemoto(remoto, 'estado/operacional'), antes);
    roda(trabalho, ['reset', '--hard', '-q']);
  });

  teste('conflito de fotografia para vigia para sem sobrescrever a ponta remota', () => {
    const p = node(trabalho, 'preparar', 'vigia');
    assert.equal(p.status, 0, p.stdout + p.stderr);
    escreve(trabalho, 'vigia-estado.json', '{"estado":"turno-antigo"}\n');
    roda(trabalho, ['add', '--', 'vigia-estado.json']);
    alteraEPublicaEstado(remoto, temp, 'vigia-estado.json', '{"estado":"ponta-nova"}\n');
    const r = node(trabalho, 'publicar', 'vigia', '424243');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /não sobrescrevi/);
    assert.equal(leNoRemoto(remoto, 'estado/operacional', 'vigia-estado.json'), '{"estado":"ponta-nova"}');
    assert.equal(leNoRemoto(remoto, 'main', 'vigia-estado.json'), '{"estado":"main"}');
    roda(trabalho, ['reset', '--hard', '-q', 'origin/main']);
  });

  teste('log de e-mail append-only incorpora concorrência sem apagar a sessão anterior', () => {
    const p = node(trabalho, 'preparar', 'email');
    assert.equal(p.status, 0, p.stdout + p.stderr);
    fs.appendFileSync(path.join(trabalho, 'email-log.md'), 'linha do turno A\n');
    roda(trabalho, ['add', '--', 'email-log.md']);
    alteraEPublicaEstado(remoto, temp, 'email-log.md', '# log\nlinha do turno B\n');
    const r = node(trabalho, 'publicar', 'email', '424244');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const estado = leNoRemoto(remoto, 'estado/operacional', 'email-log.md');
    assert.match(estado, /linha do turno A/);
    assert.match(estado, /linha do turno B/);
    assert.equal(leNoRemoto(remoto, 'main', 'email-log.md'), '# log');
  });

  teste('log de e-mail não pode reescrever a própria fotografia, mesmo sem concorrência', () => {
    roda(trabalho, ['switch', '-q', 'main']);
    roda(trabalho, ['reset', '--hard', '-q', 'origin/main']);
    const p = node(trabalho, 'preparar', 'email');
    assert.equal(p.status, 0, p.stdout + p.stderr);
    fs.writeFileSync(path.join(trabalho, 'email-log.md'), 'substituição indevida\n');
    roda(trabalho, ['add', '--', 'email-log.md']);
    const antes = hashNoRemoto(remoto, 'estado/operacional');
    const r = node(trabalho, 'publicar', 'email', '424247');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /append-only/);
    assert.equal(hashNoRemoto(remoto, 'estado/operacional'), antes);
    roda(trabalho, ['reset', '--hard', '-q']);
  });

  teste('deleção, symlink e hard link staged são recusados sem escrita remota', () => {
    for (const variante of ['delecao', 'symlink', 'hardlink']) {
      roda(trabalho, ['switch', '-q', 'main']);
      roda(trabalho, ['reset', '--hard', '-q', 'origin/main']);
      const p = node(trabalho, 'preparar', 'vigia');
      assert.equal(p.status, 0, variante + ': ' + p.stdout + p.stderr);
      const estado = path.join(trabalho, 'vigia-estado.json');
      const externo = path.join(temp, 'externo-' + variante + '.json');
      if (variante === 'delecao') roda(trabalho, ['rm', '-f', '--', 'vigia-estado.json']);
      else if (variante === 'symlink') {
        fs.writeFileSync(externo, '{"externo":true}\n');
        fs.rmSync(estado);
        fs.symlinkSync(externo, estado);
        roda(trabalho, ['add', '--', 'vigia-estado.json']);
      } else {
        fs.copyFileSync(estado, externo);
        fs.rmSync(estado);
        fs.linkSync(externo, estado);
        roda(trabalho, ['add', '--', 'vigia-estado.json']);
      }
      const antes = hashNoRemoto(remoto, 'estado/operacional');
      const r = node(trabalho, 'publicar', 'vigia', '424248');
      assert.notEqual(r.status, 0, variante + ' foi aceito');
      assert.match(r.stderr, /ausente|symlink|hard link|não regular/);
      assert.equal(hashNoRemoto(remoto, 'estado/operacional'), antes);
      roda(trabalho, ['reset', '--hard', '-q']);
      fs.rmSync(externo, { force: true });
    }
  });

  teste('atualizar-vigia é restrito à evolução já preparada', () => {
    roda(trabalho, ['switch', '-q', 'main']);
    roda(trabalho, ['reset', '--hard', '-q', 'origin/main']);
    const semPreparo = node(trabalho, 'atualizar-vigia', 'evolucao');
    assert.notEqual(semPreparo.status, 0);
    const p = node(trabalho, 'preparar', 'evolucao');
    assert.equal(p.status, 0, p.stdout + p.stderr);
    const r = node(trabalho, 'atualizar-vigia', 'evolucao');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const errado = node(trabalho, 'atualizar-vigia', 'vigia');
    assert.notEqual(errado.status, 0);
  });
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
console.log(`${certos}/${certos + falhas} testes do estado operacional controlado passaram`);
process.exitCode = falhas ? 1 : 0;
