# Rodada 133 — os dois limites, tratados um por um

`main` = **`09be81c`** · PR **#60** (squash) · check `testes` **success** · Pages **success**

## 1. "A espera pode custar até 15 s" → **RESOLVIDO**

| | antes | depois |
|---|---|---|
| teto de espera | 15 000 ms | **3 000 ms** |
| quando espera | sempre que a forte está em descanso | **só quando a única rota livre é fraca** (`leve`) |
| com rota média livre | esperava a forte | **responde na média agora** |
| descanso de 5 s | segurava a resposta | **não segura** (teste cobre) |

Prova: `tools/testes/espera-rota-boa.js` **6/6** — espera quando só resta fraco, não espera com média livre, descanso de 5 s não segura, descanso longo não vira espera, desligamento por `semEsperaBoa`.

## 2. "Raciocínio aberto é do modelo" → **BOUNDADO, não eliminado**

O que eu consegui consertar de fato:

- **Parágrafo**: `padronizarFormato()` recusava repartir frases quando a resposta vinha marcada `parcial` — e `parcial` é falta de **partes**, não corte de texto. Uma resposta de 81 palavras e 4 frases saía em 1 bloco com pedido de 2. Corrigido: só `cortado` bloqueia, e a marca `parcial` continua no objeto (o aviso de incompletude não desaparece). Banco aberto: **20/24 → 21/24**.

O que eu tentei e **rejeitei com número**:

- **Revisão de cobertura** (uma chamada extra que reescreve se faltar conceito): implementada, medida → **20/24 outra vez**, com as falhas em **outros itens** (#14 parâmetro, #22 painel, #23 dados em vez de #9 capital, #16 tratamento, #24 saúde) e mediana de **14,5 s → 45 s**. Três vezes mais espera, zero ganho. Código removido; o registro ficou em `roteador-ia.js` para ninguém repetir.

## O limite que permanece — medido, sem adjetivo

No banco aberto de 24 pedidos a nota fica entre **20/24 e 21/24**, e **as falhas trocam de item entre corridas**. `cortados: 0`, parágrafos e mínimos de palavra atendidos: o que falha é **vocabulário exigido pela rubrica**, que muda de corrida para corrida com o mesmo código. Isso é variação de texto do modelo, não defeito de forma — e nenhuma engenharia do lado do roteador corrige sem uma chamada de reescrita, que já foi medida e não pagou.

**Fato recente** (posterior ao corte de conhecimento do modelo) continua sem fonte: a busca viva foi medida na rodada 102 e **piorou** o resultado, e segue fora do caminho do produto, exportada em `bench/`. Para resolver isso de verdade seria preciso uma fonte viva confiável — é decisão de produto, não conserto de código, e eu não vou ligar algo que já mediu pior.

## Nota de honestidade sobre as medições

Durante esta rodada o pool grátis ficou saturado pelas minhas próprias corridas (a mediana do banco aberto chegou a 39 s). Por isso a prova do teto de espera é **teste unitário com dublê**, não a média do banco: média de banco aberto hoje mede saturação do pool, não o código.

## Barreira

**117/117** testes rápidos (3 ignorados), páginas derivadas sem divergência. Publicado verificado: `raw…/main/roteador-ia.js` contém `esperaRotaBoa || 3000` e `if (cand.cortado) return cand;`; `https://reboclbrank-max.github.io/chat/` → **HTTP 200**.
