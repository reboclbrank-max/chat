// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📉 CHURN PREDITIVO — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_churn_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { usuarios: [], predicoes: [], proximoId: 1 }; } catch (e) { return { usuarios: [], predicoes: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__chn_registrarUsuario = function (idUsuario, jogo, ultimoAcesso, totalAcessos, diasInativo) {
    const d = c(); const id = 'usr_' + d.proximoId++;
    const risco = diasInativo > 30 ? 'alto' : diasInativo > 14 ? 'medio' : 'baixo';
    const u = { id, idUsuario, jogo: jogo || 'ambos', ultimoAcesso, totalAcessos: Number(totalAcessos), diasInativo: Number(diasInativo), risco, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    d.usuarios.push(u); s(d); return { ok: true, usuario: u };
  };
  window.__chn_listarUsuariosRisco = function (risco, jogo) {
    const d = c(); let l = d.usuarios.filter(x => x.risco === risco); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return l;
  };
  window.__chn_atualizarUsuario = function (idUsuario, dados) {
    const d = c(); const u = d.usuarios.find(x => x.idUsuario === idUsuario); if (!u) return { ok: false, erro: 'Usuário não encontrado' };
    if (dados.diasInativo !== undefined) u.diasInativo = Number(dados.diasInativo);
    if (dados.totalAcessos !== undefined) u.totalAcessos = Number(dados.totalAcessos);
    if (dados.ultimoAcesso !== undefined) u.ultimoAcesso = dados.ultimoAcesso;
    u.risco = u.diasInativo > 30 ? 'alto' : u.diasInativo > 14 ? 'medio' : 'baixo'; u.atualizadoEm = new Date().toISOString();
    s(d); return { ok: true, usuario: u };
  };
  window.__chn_estatisticasChurn = function () { const d = c(); const total = d.usuarios.length; return { total, altoRisco: d.usuarios.filter(x => x.risco === 'alto').length, medioRisco: d.usuarios.filter(x => x.risco === 'medio').length, baixoRisco: d.usuarios.filter(x => x.risco === 'baixo').length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);