// Cliente local da atualização PWA. Depende apenas das bases declaradas pela rota
// antes deste script: $, escritaEmAndamento e os controles de atualização.
const TEMPO_MAXIMO_ATIVACAO_PWA = 15000;
let registroPwa = null, atualizacaoPwaPendente = null, recarregarAposAtualizacaoPwa = false, intervaloAtualizacaoPwa = null;
let ativacaoPwaEmAndamento = false, falhaAtivacaoPwa = false, temporizadorAtivacaoPwa = null;

function limparTemporizadorAtivacaoPwa() {
  if (temporizadorAtivacaoPwa === null) return;
  clearTimeout(temporizadorAtivacaoPwa);
  temporizadorAtivacaoPwa = null;
}
function atualizarAvisoAtualizacaoPwa() {
  if (typeof document === 'undefined') return;
  const aviso = $('aviso-atualizacao');
  const texto = $('texto-atualizacao');
  const botao = $('btn-aplicar-atualizacao');
  if (!aviso || !texto || !botao) return;
  if (!atualizacaoPwaPendente) {
    aviso.classList.add('oculto');
    aviso.setAttribute('aria-hidden', 'true');
    return;
  }
  if (ativacaoPwaEmAndamento) {
    texto.textContent = 'Ativando a atualização. A página só recarrega depois da confirmação.';
    botao.disabled = true;
    botao.textContent = 'Atualizando…';
    aviso.classList.remove('oculto');
    aviso.setAttribute('aria-hidden', 'false');
    return;
  }
  const haEscrita = escritaEmAndamento();
  const entrada = $('entrada');
  const haRascunho = !!(entrada && String(entrada.value || '').trim());
  texto.textContent = haEscrita
    ? 'Atualização pronta. Aguarde o envio, a importação ou a sincronização terminar antes de atualizar.'
    : haRascunho
      ? 'Atualização pronta. Envie ou copie o rascunho antes de atualizar para não perdê-lo.'
      : falhaAtivacaoPwa
        ? 'Não foi possível confirmar a ativação agora. Você pode tentar novamente quando quiser.'
        : 'Uma atualização está pronta. Você decide quando recarregar esta página.';
  botao.disabled = haEscrita || haRascunho;
  botao.textContent = falhaAtivacaoPwa ? 'Tentar atualizar' : 'Atualizar agora';
  aviso.classList.remove('oculto');
  aviso.setAttribute('aria-hidden', 'false');
}
function falharAtivacaoPwa() {
  if (!ativacaoPwaEmAndamento) return;
  limparTemporizadorAtivacaoPwa();
  ativacaoPwaEmAndamento = false;
  recarregarAposAtualizacaoPwa = false;
  falhaAtivacaoPwa = true;
  atualizarAvisoAtualizacaoPwa();
}
function marcarAtualizacaoPwa(registro) {
  if (!registro || !registro.waiting) return;
  limparTemporizadorAtivacaoPwa();
  atualizacaoPwaPendente = registro.waiting;
  ativacaoPwaEmAndamento = false;
  falhaAtivacaoPwa = false;
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
  if (!atualizacaoPwaPendente || ativacaoPwaEmAndamento || escritaEmAndamento()) { atualizarAvisoAtualizacaoPwa(); return; }
  const entrada = $('entrada');
  if (entrada && String(entrada.value || '').trim()) { atualizarAvisoAtualizacaoPwa(); entrada.focus(); return; }
  falhaAtivacaoPwa = false;
  ativacaoPwaEmAndamento = true;
  recarregarAposAtualizacaoPwa = true;
  atualizarAvisoAtualizacaoPwa();
  temporizadorAtivacaoPwa = setTimeout(falharAtivacaoPwa, TEMPO_MAXIMO_ATIVACAO_PWA);
  try { atualizacaoPwaPendente.postMessage({ tipo: 'REBOCL_ATIVAR_ATUALIZACAO' }); }
  catch (e) { falharAtivacaoPwa(); }
}

function iniciarPwaCompartilhado() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      const recarregar = recarregarAposAtualizacaoPwa;
      limparTemporizadorAtivacaoPwa();
      atualizacaoPwaPendente = null;
      ativacaoPwaEmAndamento = false;
      falhaAtivacaoPwa = false;
      recarregarAposAtualizacaoPwa = false;
      if (recarregar) window.location.reload();
      else atualizarAvisoAtualizacaoPwa();
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (registro) {
      registroPwa = registro;
      marcarAtualizacaoPwa(registro);
      registro.addEventListener('updatefound', () => observarInstalacaoPwa(registro));
      intervaloAtualizacaoPwa = setInterval(function () { try { registro.update(); } catch (e) {} }, 300000);
    }).catch(() => {});
  }
}
