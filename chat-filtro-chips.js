// Filtro local dos atalhos visíveis: não envia, não persiste e não consulta a rede.
(function () {
  'use strict';

  function normalizar(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }

  function iniciarFiltroChips() {
    const entrada = document.getElementById('filtro-chips');
    const caixa = document.getElementById('chips');
    const resultado = document.getElementById('resultado-filtro-chips');
    if (!entrada || !caixa || !resultado) return false;

    const aplicar = function () {
      const consulta = normalizar(entrada.value);
      const chips = Array.from(caixa.querySelectorAll('button.chip'));
      let visiveis = 0;
      for (const chip of chips) {
        const corpus = chip.dataset && chip.dataset.busca ? chip.dataset.busca : chip.textContent;
        const mostrar = !consulta || normalizar(corpus).includes(consulta);
        chip.hidden = !mostrar;
        if (mostrar) visiveis++;
      }
      resultado.textContent = consulta
        ? (visiveis ? visiveis + (visiveis === 1 ? ' atalho' : ' atalhos') : 'Nenhum atalho')
        : '';
    };

    entrada.addEventListener('input', aplicar);
    entrada.addEventListener('search', aplicar);
    entrada.addEventListener('keydown', function (evento) {
      const tecla = String(evento.key || '');
      const atalhoGlobal = (evento.ctrlKey || evento.metaKey) && (tecla === 'Enter' || tecla.toLowerCase() === 'n');
      // O filtro nunca deve acionar os atalhos globais de envio ou nova conversa.
      if (atalhoGlobal) {
        evento.preventDefault();
        evento.stopPropagation();
        return;
      }
      // A barra aceita '/' como texto, sem roubar o foco para o compositor.
      if (tecla === '/') {
        evento.stopPropagation();
        return;
      }
      if (tecla === 'Escape' && entrada.value) {
        evento.preventDefault();
        evento.stopPropagation();
        entrada.value = '';
        aplicar();
      }
    });
    aplicar();
    return true;
  }

  window.iniciarFiltroChips = iniciarFiltroChips;
}());
