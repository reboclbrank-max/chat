// Identifica remetentes sintéticos da suíte, inclusive o caso que simula pessoa não autorizada.
'use strict';

function aliasesDeTeste(usuario) {
  const valor = String(usuario || '');
  const arroba = valor.indexOf('@');
  if (arroba <= 0) return { teste: 'teste@exemplo.com', estranho: 'estranho@exemplo.com' };
  const base = valor.slice(0, arroba);
  const dominio = valor.slice(arroba);
  return { teste: base + '+teste' + dominio, estranho: base + '+estranho' + dominio };
}

function ehRemetenteSintetico(endereco, aliases) {
  const valor = String(endereco || '').toLowerCase();
  return [aliases && aliases.teste, aliases && aliases.estranho].filter(Boolean)
    .some(alias => valor.indexOf(String(alias).toLowerCase()) >= 0);
}

module.exports = { aliasesDeTeste, ehRemetenteSintetico };
