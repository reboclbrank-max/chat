// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💾 BACKUP AUTOMÁTICO AVANÇADO — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_backup_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { backups: [], proximoId: 1 }; } catch (e) { return { backups: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__bk_registrarBackup = function (tipo, arquivo, tamanho, status) {
    const d = c(); const id = 'bkp_' + d.proximoId++;
    const b = { id, tipo, arquivo, tamanho: tamanho || 0, status: status || 'sucesso', criadoEm: new Date().toISOString() };
    d.backups.push(b); s(d); return { ok: true, backup: b };
  };
  window.__bk_listarBackups = function (limite) { const d = c(); return d.backups.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)).slice(0, limite || 20); };
  window.__bk_estatisticasBackups = function () { const d = c(); const total = d.backups.length; return { total, sucesso: d.backups.filter(b => b.status === 'sucesso').length, falhas: d.backups.filter(b => b.status === 'falha').length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);