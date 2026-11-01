# Cookie do itch — guia com os nomes em português

> O itch estar traduzido **não muda nada**: o DevTools é do *navegador*, então ele fala o
> idioma do navegador. Se o seu Chrome/Edge está em português, os botões são os de baixo.

## Antes de tudo

- Faça **no computador**. No celular não existe DevTools.
- A aba precisa estar **logada** no itch (se você vê o painel do CEIFALUME, está logada).

## Passo 1 — abrir o DevTools

1. Abra: `https://itch.io/dashboard/game/5017404/edit`
   (é a página de edição do CEIFALUME; tem que aparecer o formulário com título, resumo etc.)
2. Aperte **F12**. Se não abrir nada, tente **Ctrl + Shift + I**.
   (ou clique com o botão direito em qualquer lugar da página → **Inspecionar**)

Abre um painel geralmente à direita ou embaixo, cheio de código. Não se assuste, você não
vai mexer em nada.

## Passo 2 — achar o cookie (Caminho A — mais fácil)

1. No topo desse painel há uma fileira de abas. Procure **Aplicativo**
   (no Edge/Chrome em inglês seria *Application*). Se não estiver visível, clique em **»**.
2. Na coluna da esquerda, procure **Armazenamento** (*Storage*) e abra **Cookies**.
3. Clique em **https://itch.io** (aparece embaixo de Cookies).
4. Aparece uma tabela. Role até achar a linha onde **Nome** = `itchio_token`.
5. Clique em cima dessa linha. Na coluna **Valor** (*Value*), dê **duplo clique** no valor,
   aperte **Ctrl + C** (ou Cmd + C no Mac).

Pronto: o que está na área de transferência é o valor do cookie.

## Passo 2 alternativo — Caminho B (se não achar "Aplicativo")

1. No painel do DevTools, clique na aba **Rede** (*Network*).
2. Aperte **F5** para recarregar a página com o painel aberto.
3. Clique na **primeira linha** da lista (normalmente `edit` ou `5017404`).
4. À direita, procure **Cabeçalhos** (*Headers*) → seção **Cabeçalhos da requisição**
   → linha **Cookie**.
5. Ali aparece um texto comprido tipo
   `itchio_token=WyJxxxx....; outra_coisa=abc; ...`
6. Copie **só o pedaço** que começa em `itchio_token=` e vai até o ponto e vírgula `;`
   (ou até o fim, se não tiver `;` depois).

## Passo 3 — colar no GitHub

1. Abra: **https://github.com/reboclbrank-max/site/settings/secrets/actions/new**
2. **Name**: `ITCH_COOKIE`  ← exatamente assim, maiúsculo
3. **Secret**: cole assim, sem espaço e sem aspas:

```
itchio_token=COLE_AQUI_O_QUE_VOCE_COPIOU
```

   ⚠️ A parte `itchio_token=` faz parte do valor. Se você copiou pelo Caminho B, ela já vem
   junto — não duplique.
4. Clique em **Add secret**.

## Passo 4 — conferir que deu certo

- O valor tem normalmente entre **80 e 200 caracteres** e pode ter `+`, `/` e `=` no meio.
  (Não pode ter espaço nem quebra de linha.)
- Me diga **"coloquei"** e eu disparo o teste na hora: o run vai dizer
  `OK sessao: …` e listar os campos reais da página, ou `FALHOU sessao: …` com o motivo.

## Sobre "durar 3 meses ou mais"

Não dá para eu prometer isso, e não vou fingir que dá: quem decide a validade é o servidor do
itch, e o token **não se renova pelo uso** (medido: uso o token válido, o itch não devolve um
novo). O que está sob o **seu** controle:

- **não clicar em "Sair"** naquele navegador (sair mata a sessão);
- **não trocar a senha** do itch (trocar costuma derrubar todas as sessões);
- usar o mesmo navegador/perfil.

O que está sob o **meu** controle: o **vigia diário** (`vigia-sessao-itch.yml`) roda todo dia
às 09:00 e te manda push assim que a sessão cair. Então o pior caso é: você descobre no mesmo
dia e renova em 20 segundos — não fica semanas sem controle.

E o controle que **nunca** depende disso: o favorito `itch/preencher-bookmarklet.txt`.
