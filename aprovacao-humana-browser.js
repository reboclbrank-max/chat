// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ WORKFLOW DE APROVAÇÃO HUMANA — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function (global) {
  'use strict';

  const CHAVE = 'assistente_rebocl_aprovacao_v1';

  function carregar() {
    try {
      const b = localStorage.getItem(CHAVE);
      if (b) return JSON.parse(b);
    } catch (e) {}
    return {
      rascunhos: [], pendentes: [], aprovados: [], publicados: [], rejeitados: [],
      proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(),
    };
  }
  function salvar(c) {
    try {
      c.atualizadoEm = new Date().toISOString();
      localStorage.setItem(CHAVE, JSON.stringify(c));
    } catch (e) {}
  }

  window.__aprov_criarRascunho = function (texto, rede, jogo, tipoPost) {
    const c = carregar();
    const id = 'aprov_' + c.proximoId++;
    const rascunho = {
      id, texto, rede, jogo: jogo || 'ambos', tipoPost: tipoPost || 'normal',
      status: 'rascunho', criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(),
      revisadoPor: null, revisadoEm: null, motivoRejeicao: null,
      agendadoPara: null, publicadoEm: null, resultadoPublicacao: null,
    };
    c.rascunhos.push(rascunho);
    salvar(c);
    return { ok: true, rascunho };
  };

  window.__aprov_enviarParaRevisao = function (id) {
    const c = carregar();
    const idx = c.rascunhos.findIndex(r => r.id === id);
    if (idx < 0) return { ok: false, erro: 'Rascunho não encontrado' };
    const rascunho = c.rascunhos[idx];
    rascunho.status = 'pendente';
    rascunho.atualizadoEm = new Date().toISOString();
    c.pendentes.push(rascunho);
    c.rascunhos.splice(idx, 1);
    salvar(c);
    return { ok: true, rascunho };
  };

  window.__aprov_aprovar = function (id, revisadoPor) {
    const c = carregar();
    const idx = c.pendentes.findIndex(r => r.id === id);
    if (idx < 0) return { ok: false, erro: 'Item pendente não encontrado' };
    const item = c.pendentes[idx];
    item.status = 'aprovado';
    item.revisadoPor = revisadoPor || 'humano';
    item.revisadoEm = new Date().toISOString();
    item.atualizadoEm = new Date().toISOString();
    c.aprovados.push(item);
    c.pendentes.splice(idx, 1);
    salvar(c);
    return { ok: true, item };
  };

  window.__aprov_rejeitar = function (id, motivo, revisadoPor) {
    const c = carregar();
    const idx = c.pendentes.findIndex(r => r.id === id);
    if (idx < 0) return { ok: false, erro: 'Item pendente não encontrado' };
    const item = c.pendentes[idx];
    item.status = 'rejeitado';
    item.revisadoPor = revisadoPor || 'humano';
    item.revisadoEm = new Date().toISOString();
    item.motivoRejeicao = motivo;
    item.atualizadoEm = new Date().toISOString();
    c.rejeitados.push(item);
    c.pendentes.splice(idx, 1);
    salvar(c);
    return { ok: true, item };
  };

  window.__aprov_agendarAprovado = function (id, horarioISO) {
    const c = carregar();
    const idx = c.aprovados.findIndex(r => r.id === id);
    if (idx < 0) return { ok: false, erro: 'Item aprovado não encontrado' };
    const item = c.aprovados[idx];

    const resultado = window.__agend_agendarPost
      ? window.__agend_agendarPost(item.texto, item.rede, item.jogo, horarioISO)
      : null;

    if (!resultado || !resultado.ok) {
      return { ok: false, erro: 'não foi possível agendar' };
    }

    item.status = 'agendado';
    item.agendadoPara = resultado.horarioAgendado;
    item.atualizadoEm = new Date().toISOString();
    c.aprovados.splice(idx, 1);
    c.publicados.push(item);
    salvar(c);
    return { ok: true, item };
  };

  window.__aprov_registrarPublicacao = function (id, resultado) {
    const c = carregar();
    const item = c.publicados.find(p => p.id === id);
    if (!item) return { ok: false, erro: 'Item não encontrado' };
    item.status = 'publicado';
    item.publicadoEm = new Date().toISOString();
    item.resultadoPublicacao = resultado;
    item.atualizadoEm = new Date().toISOString();
    salvar(c);
    return { ok: true, item };
  };

  window.__aprov_listar = function (status) {
    const c = carregar();
    if (status) return c[status] || [];
    return { rascunhos: c.rascunhos, pendentes: c.pendentes, aprovados: c.aprovados, publicados: c.publicados, rejeitados: c.rejeitados };
  };

  window.__aprov_estatisticas = function () {
    const c = carregar();
    return {
      rascunhos: c.rascunhos.length, pendentes: c.pendentes.length,
      aprovados: c.aprovados.length, publicados: c.publicados.length,
      rejeitados: c.rejeitados.length,
      total: c.rascunhos.length + c.pendentes.length + c.aprovados.length + c.publicados.length + c.rejeitados.length,
    };
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);