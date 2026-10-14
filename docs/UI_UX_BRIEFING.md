# Briefing de UI e UX

> **Projeto:** Vagas Consulting (`rodneicalixto-prog/vagas_consulting`) · **App:** v0.1.0 · **Documento:** Briefing de UI/UX v1.1 · **Data:** 14/10/2026 · **Status:** rascunho retroativo, lido antes de construir (ver `docs/README.md`)


> Rascunho gerado a partir de `src/app/globals.css`, `src/app/manifest.ts`
> e `src/components/ui.tsx`.

## Público e tom

Candidatos a vagas efetivas/PJ/temporárias e equipe interna de RH/operação.
Três adjetivos observados no design real: **sóbrio, confiável, corporativo**
(paleta navy + dourado, tipografia geométrica limpa). [A PREENCHER: confirmar
se esses três adjetivos são os pretendidos ou se há um briefing de marca
diferente — não está documentado fora do CSS.]

## Produtos de referência

[A PREENCHER — pergunta: quais apps/sites foram usados como referência
visual? Não há registro disso em nenhum `.md`; a logomarca (`logomarca.png`,
na pasta pai do projeto) foi o único ativo de marca recebido.]

## Paleta de cores (extraída de `globals.css`)

| Token | Valor | Uso |
|---|---|---|
| `--color-navy` | `#101d33` | Cor primária de marca (`theme_color` do PWA) |
| `--color-navy-2` | `#1b2d4d` | Navy secundário |
| `--color-navy-3` | `#0b1526` | Navy escuro |
| `--color-gold` | `#b8924c` | Cor de destaque |
| `--color-gold-2` | `#d9b877` | Dourado claro |
| `--color-gold-3` | `#8f6f37` | Dourado escuro |
| `--color-bg` | `#faf8f4` | Fundo geral (`background_color` do PWA) |
| `--color-surface` | `#ffffff` | Superfície de cards |
| `--color-border` | `#e7e2d8` | Bordas |
| `--color-text` | `#14171c` | Texto principal |
| `--color-text-2` | `#5c6470` | Texto secundário |
| `--color-text-3` | `#9aa0a8` | Texto terciário/placeholder |
| `--color-teal` | `#3f7a86` | Cor de status informativo |
| `--color-teal-bg` | `#e7f0f1` | Fundo de status informativo |
| `--color-navy-bg` | `#e9edf3` | Fundo de destaque navy |
| `--color-gold-bg` | `#f6ecd9` | Fundo de destaque dourado |
| `--color-success` | `#3f7a5c` | Status de sucesso |
| `--color-success-bg` | `#eaf3ec` | Fundo de sucesso |
| `--color-danger` | `#b3492f` | Status de erro/alerta |
| `--color-danger-bg` | `#f7ece8` | Fundo de erro |

## Tipografia

Família: **Manrope**, com fallback `"Segoe UI", Arial, sans-serif`
(`--font-sans`). [A PREENCHER: escala de tamanhos de título/corpo não está
centralizada em tokens CSS — segue as classes utilitárias do Tailwind
diretamente nos componentes, não há uma escala documentada à parte.]

## Componentes

Biblioteca própria centralizada em `src/components/ui.tsx`, mais
componentes especializados: `data-table.tsx` (com paginação, ver
`Pagination.tsx`), `charts.tsx` (Recharts), `form-buttons.tsx`, `icons.tsx`,
`admin-shell.tsx` / `app-shell.tsx` (layout de cada área), `brand-mark.tsx`
(marca), modais com animação de entrada (`@keyframes modalIn` +
`modalOverlay`, blur de fundo).

## Regras de layout

[A PREENCHER: grid, breakpoints e espaçamento seguem o padrão default do
Tailwind 4 — não há customização de breakpoint documentada em
`tailwind.config` (o projeto usa `@theme inline` direto no CSS, sem arquivo
de config Tailwind separado). Se há uma intenção específica de
grid/breakpoint além do padrão, preciso que você descreva.]

## Notas por tela

Não centralizado em documento — cada página (`page.tsx`) implementa sua
própria hierarquia visual. [A PREENCHER: se você quer um inventário
tela-a-tela de conteúdo principal/hierarquia, isso exige ler os ~45
arquivos de página individualmente; me diga se vale o esforço ou se as
telas já publicadas como protótipo (links no `PROJETO.md` da pasta raiz)
já cobrem essa necessidade.]

## Acessibilidade

[A PREENCHER — pergunta: existe meta formal de contraste (WCAG AA/AAA),
navegação por teclado ou uso de leitor de tela testado? Não há registro
disso em nenhum `.md` nem indício de auditoria de acessibilidade no
histórico de commits.]

## Estados de interação

Modal: overlay com blur progressivo (`backdrop-filter: blur(6px)`) e
entrada em `scale(0.93)→scale(1)` com easing customizado
(`cubic-bezier(0.22,1,0.36,1)`, 0.32s). Demais estados (hover, foco,
desabilitado, carregando, erro, sucesso) são tratados componente a
componente em `ui.tsx` e `form-buttons.tsx`, sem um guia central.

## Arquivos necessários

- ✅ Logo recebida (`logomarca.png`, pasta pai do repositório).
- Ícones PWA: `public/icons/icon-192.png`, `icon-512.png`,
  `icon-512-maskable.png`, `icon-32.png` — já existem no projeto.
- [A PREENCHER: existe algum ativo visual pendente — ilustrações, prints de
  referência — que ainda não foi entregue?]
