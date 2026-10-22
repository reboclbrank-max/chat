# Portabilidade da casca estática do Chat

## O que é portátil agora

A casca pública é composta por HTML, CSS, JavaScript, ícones e service worker locais/same-origin. As quatro entradas públicas carregam seus ativos por caminhos relativos, e o service worker só precacheia a casca local. Não há framework, CDN de script/estilo ou dependência remota necessária para renderizar a interface básica.

Isso permite copiar a casca para um host estático já existente e autorizado no futuro, sem reescrever o produto nem criar conta agora.

## O que não é transferido automaticamente

Uma cópia estática não leva, nem deve simular:

- token guardado no navegador;
- conversas, Issues ou API GitHub;
- e-mail, Telegram, Actions, segredos ou estado operacional;
- modelos/serviços de resposta externos;
- domínio, DNS, certificado, disponibilidade, analytics ou suporte.

Essas integrações continuam dependentes de configuração existente e decisão humana. Migrar hospedagem não resolveria uma fila de Actions por si só.

## Guarda verificável

`tools/testes/portabilidade-estatica.js` confere que os ativos de marcação das entradas públicas permanecem relativos/same-origin, que cada caminho local existe e que toda casca declarada entra no precache estático. Ele também confere `start_url`, `scope` e ícones do manifesto, e que o service worker não importa script externo nem aceita origem diferente. O worker v89 usa a página inicial em cache somente como fallback para uma navegação; CSS, JavaScript, imagem ou outro ativo cacheável ausente devolve falha de rede, nunca HTML com tipo incorreto. Assim, uma referência local quebrada ou um ativo novo esquecido fora do cache falha antes da revisão; isso ainda não testa instalação em aparelho ou serviços configurados.

## Caminho futuro permitido

Um espelho somente de leitura pode ser considerado apenas quando houver destino gratuito já configurado, responsável definido, rollback, política de DNS e revisão humana. Não criar conta, domínio, cartão, serviço pago ou deploy externo automático como atalho.
