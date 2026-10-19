function marcarAtualizacaoPwa(registro) {
  if (!registro || !registro.waiting) return;
  atualizacaoPwaPendente = registro.waiting;
  atualizarAvisoAtualizacaoPwa();
}
function observarInstalacaoPwa(registro) {
  const worker = registro && registro.installing;
  if (!worker) return;
  worker.addEventListener('statechange', () => {
    if (worker.state !== 'installed') return;
    // A primeira instalação não interrompe a pessoa. Nas seguintes, a nova
    // versão espera uma escolha explícita e uma tela sem escrita/rascunho.
    setTimeout(() => { if (navigator.serviceWorker.controller) marcarAtualizacaoPwa(registro); }, 0);
  });
}
function solicitarAtualizacaoPwa() {
  if (!atualizacaoPwaPendente || escritaEmAndamento()) { atualizarAvisoAtualizacaoPwa(); return; }
  const entrada = $('entrada');
  if (entrada && String(entrada.value || '').trim()) { atualizarAvisoAtualizacaoPwa(); entrada.focus(); return; }
  const worker = atualizacaoPwaPendente;
  const botao = $('btn-aplicar-atualizacao');
  if (botao) { botao.disabled = true; botao.textContent = 'Atualizando…'; }
  recarregarAposAtualizacaoPwa = true;
  try { worker.postMessage({ tipo: 'REBOCL_ATIVAR_ATUALIZACAO' }); }
  catch (e) { recarregarAposAtualizacaoPwa = false; if (botao) botao.textContent = 'Atualizar agora'; atualizarAvisoAtualizacaoPwa(); }
}

function iniciarPwaCompartilhado() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (recarregarAposAtualizacaoPwa) window.location.reload();
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (registro) {
      registroPwa = registro;
      marcarAtualizacaoPwa(registro);
      registro.addEventListener('updatefound', () => observarInstalacaoPwa(registro));
      intervaloAtualizacaoPwa = setInterval(function () { try { registro.update(); } catch (e) {} }, 300000);
    }).catch(() => {});
  }
}
