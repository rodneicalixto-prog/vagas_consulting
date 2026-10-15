# Briefing de UI e UX

> **Projeto:** Vagas Consulting (`rodneicalixto-prog/vagas_consulting`) · **App:** v0.1.0 · **Documento:** Briefing de UI/UX v1.8 · **Data:** 15/10/2026 · **Status:** rascunho retroativo, lido antes de construir (ver `docs/README.md`)


> Rascunho gerado a partir de `src/app/globals.css`, `src/app/manifest.ts`
> e `src/components/ui.tsx`.

## Público e tom

Candidatos a vagas efetivas/PJ/temporárias e equipe interna de RH/operação.
Três adjetivos observados no design real: **sóbrio, confiável, corporativo**
(paleta navy + dourado, tipografia geométrica limpa). Observado no design; o Rodnei não confirmou o uso pretendido (14/10/2026) — manter como está até haver briefing de marca.

## Produtos de referência

**Nenhuma referência visual externa** (resposta do Rodnei, 14/10/2026).

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
(`--font-sans`). **Decisão (14/10/2026): documentar a escala tipográfica em tokens** — pendente de execução. Hoje segue as classes utilitárias do Tailwind direto nos componentes.

## Componentes

Biblioteca própria centralizada em `src/components/ui.tsx`, mais
componentes especializados: `data-table.tsx` (com paginação, ver
`Pagination.tsx`), `charts.tsx` (Recharts), `form-buttons.tsx`, `icons.tsx`,
`admin-shell.tsx` / `app-shell.tsx` (layout de cada área), `brand-mark.tsx`
(marca), modais com animação de entrada (`@keyframes modalIn` +
`modalOverlay`, blur de fundo).

## Regras de layout

**Decisão (14/10/2026): definir grid e breakpoints próprios** — pendente de execução. Hoje vale o padrão do Tailwind 4 (sm 640, md 768, lg 1024, xl 1280, 2xl 1536 px).

## Notas por tela

Não centralizado em documento — cada página (`page.tsx`) implementa sua
própria hierarquia visual. **Decisão (14/10/2026): inventário tela a tela feito** — ver Anexo A.

## Acessibilidade

**Meta (14/10/2026): WCAG 2.1 AA.** Contraste da paleta verificado no Anexo B; navegação por teclado e leitor de tela ainda não testados.

## Estados de interação

Modal: overlay com blur progressivo (`backdrop-filter: blur(6px)`) e
entrada em `scale(0.93)→scale(1)` com easing customizado
(`cubic-bezier(0.22,1,0.36,1)`, 0.32s). Demais estados (hover, foco,
desabilitado, carregando, erro, sucesso) são tratados componente a
componente em `ui.tsx` e `form-buttons.tsx`, sem um guia central.

## Arquivos necessários

- ✅ Logo recebida (`logomarca.png`, pasta pai do repositório). **Decisão do Rodnei (14/10/2026): a marca do app é Vagas Consulting**; o logo "SOS Consulting — Método Previsa" enviado no mesmo dia é de outra marca e não foi aplicado.
- Ícones PWA: `public/icons/icon-192.png`, `icon-512.png`,
  `icon-512-maskable.png`, `icon-32.png` — já existem no projeto.
- Nenhum ativo visual pendente conhecido (Rodnei, 14/10/2026); reavaliar quando houver a campanha de divulgação.


> **Regra de dinheiro (14/10/2026):** valores de remuneração são sempre em reais; o formulário tem prefixo R$ fixo e máscara, e o valor é salvo como `R$ 0.000,00`.

## Carteira e sigilo na interface (v1.4, 14/10/2026)

- **Tela Carteira** (superadmin): lista de empresas com os operadores, chave
  Ativo/Inativo e seleção "Operador de confiança"; confirmação ao desativar.
- **Selo "Confidencial"** nas vagas sigilosas do painel; formulário de vaga com
  campo "Vaga confidencial" visível só para admin/superadmin.
- **Operador**: empresa **pré-selecionada e travada** no cadastro de vaga; menu
  sem as telas restritas; botão "Publicar" ausente.
- **Candidato**: "Empresa confidencial" no lugar do nome; mesmo estilo de texto,
  sem ícone enganoso. Contraste e foco conforme a meta WCAG 2.1 AA.

## Anexo A — Inventário de telas e estados vazios (14/10/2026)

Gerado a partir de `src/app/**/page.tsx`. A coluna "Estado vazio" é o texto
encontrado no código; "—" significa que não há mensagem de estado vazio
detectada na página (pode haver em componente filho).

| Rota | Título (h1 / função) | Estado vazio |
|---|---|---|
| `/ (landing)` | — | — |
| `/login` | Login do candidato | — |
| `/onboarding` | Complete seu perfil | — |
| `/experiencias` | Currículo e experiências | — |
| `/termos` | Termos e consentimento | — |
| `/inicio` | Início do candidato | Nenhuma vaga publicada no momento. |
| `/vagas` | Vagas | Nenhuma vaga publicada no momento. |
| `/vagas/[id]` | Detalhe da vaga | — |
| `/vagas/[id]/candidatura` | Candidatura | — |
| `/processos` | Meus processos | — |
| `/mensagens` | Mensagens | — |
| `/perfil` | Perfil | — |
| `/perfil/dados-pessoais` | Dados pessoais | — |
| `/perfil/documentos` | Documentos | — |
| `/perfil/preferencias-vaga` | Preferências de vaga | — |
| `/admin/login` | Login administrativo | — |
| `/admin` | Visão geral | Nenhuma empresa aguardando. / Nenhuma solicitação aguardando. |
| `/admin/empresas` | Empresas | Nenhuma empresa cadastrada. |
| `/admin/vagas` | Cadastro de vagas | Nenhuma vaga cadastrada. |
| `/admin/candidatos` | Candidatos | Nenhum candidato cadastrado. |
| `/admin/candidatos/[id]` | Perfil do candidato | Nenhuma candidatura ainda. |
| `/admin/leads` | Leads (app instalado) | Nenhum lead ainda. |
| `/admin/estrategico` | Estratégico | Nenhuma candidatura ainda. |
| `/admin/prestacoes` | Prestações de serviço | Nenhuma candidatura marcada como Contratado ainda. / Nenhuma prestação de serviço registrada. |
| `/admin/agenda` | Minha agenda | Nenhum compromisso agendado. |
| `/admin/agenda/equipe` | Agenda da equipe | Nenhum compromisso no período. |
| `/admin/denuncias` | Denúncias | Nenhuma denúncia aberta. / Nenhuma denúncia fechada ainda. |
| `/admin/blacklist` | Black list | — |
| `/admin/lgpd` | LGPD | Nenhuma solicitação aberta. / Nenhuma ainda. |
| `/admin/auditoria` | Auditoria | Nenhum registro ainda. |
| `/admin/acesso` | Acesso e permissões | — |
| `/admin/acesso-negado` | Acesso não autorizado | — |

Páginas auditadas: 32. Lacuna conhecida: telas do candidato sem estado vazio
detectado (`/processos`, `/mensagens`, `/perfil/documentos`) — verificar nos
componentes antes de dar como cobertas.

## Anexo B — Contraste da paleta (WCAG 2.1 AA, 14/10/2026)

AA exige 4,5:1 para texto normal e 3:1 para texto grande (≥ 24 px, ou
≥ 18,66 px em negrito).

| Combinação | Razão | Resultado |
|---|---|---|
| texto `#14171c` sobre fundo `#faf8f4` | 16,93 | ✅ AA |
| texto-2 `#5c6470` sobre fundo / superfície | 5,64 / 5,98 | ✅ AA |
| texto-3 `#626a75` (antes `#9aa0a8`, 2,48) sobre fundo / superfície | 5,2 / 5,5 | ✅ AA — corrigido em 14/10/2026 |
| branco sobre navy `#101d33` | 16,86 | ✅ AA |
| dourado `#b8924c` sobre navy | 5,82 | ✅ AA |
| dourado-2 `#d9b877` sobre navy | 8,89 | ✅ AA |
| navy sobre dourado | 5,82 | ✅ AA |
| dourado `#b8924c` sobre branco | 2,89 | ✅ não é usado como texto: só em barras, toggles e fundo de botão |
| texto `#1c1508` (usado nos botões) sobre dourado | 6,25 | ✅ AA — branco sobre dourado não é usado |
| dourado-3 `#8f6f37` sobre branco | 4,67 | ✅ AA |
| perigo `#b3492f` sobre branco / sobre perigo-bg | 5,37 / 4,63 | ✅ AA |
| sucesso `#3f7a5c` sobre branco | 5,06 | ✅ AA |
| sucesso sobre sucesso-bg `#eaf3ec` | 4,47 | ⚠️ só texto grande |
| teal `#3f7a86` sobre branco | 4,84 | ✅ AA |
| teal sobre teal-bg `#e7f0f1` | 4,18 | ⚠️ só texto grande |
| dourado-3 sobre dourado-bg `#f6ecd9` | 3,98 | ⚠️ só texto grande |

Ações recomendadas (não executadas): escurecer `--color-text-3` (≈ `#6b7280`
ou mais escuro); usar texto navy em fundos dourados; usar dourado-3 em vez
de dourado para texto sobre fundo claro; escurecer levemente sucesso/teal
quando usados sobre seus fundos `-bg`.

## Atualização v1.5 (14/10/2026) — telas novas

- **Carteira:** tabela operador × empresa com ações "liberar/revogar
  confidenciais" e "remover da carteira".
- **Talentos:** cartões de resumo (nome, cargo, cidade, disponibilidade) com
  seletor de vaga e botão Convidar; sem dados de contato.
- **Ranking:** quatro totais no topo e três listas (candidatos, vagas,
  empresas).
- **Linha do tempo:** lista vertical com ponto por etapa, etapa atual em
  destaque e aviso de resultado ao final.
- Selo "Confidencial" nas vagas e "Empresa confidencial" para o candidato.

## Atualização v1.6 (15/10/2026)

- **Padrão de lista densa:** cascata empresa → item com `<details>`, chips de
  filtro com contagem e busca; nunca um cartão grande por item (Vagas,
  Candidatos, Empresas).
- **Inbox:** duas colunas (lista e conversa); no celular, uma por vez; motivo
  do bloqueio de envio na própria caixa.
- **Cofre:** linha abre sozinha quando a chave existe e falta testar; campo de
  chave é só de escrita (`••••` + 4 últimos).
- **Cadastro do candidato:** "Voltar" em todas as etapas; "Aceitar todos os
  canais" como clique do titular (nunca pré-marcado).

## Atualização v1.7 (15/10/2026)

- **Verificação visível:** todo texto ou documento gerado mostra a lista de
  verificações com três níveis (OK, Aviso, Bloqueia); bloqueio impede a ação,
  aviso deixa passar assumindo.
- **A pessoa decide:** botões de ação registram o que a pessoa fez fora da
  plataforma ("Já enviei"); nada é enviado sozinho.
- **Campo em branco à mostra:** `{CAMPO}` destacado em dourado e envio travado.
- **Não avaliado é um estado próprio**, nunca zero nem "não atende".
- **Duas folhas:** candidato e aplicador em telas e arquivos separados.
- **Sem dado:** indicador sem dado diz "sem dado".
- **Saída:** botões "Imprimir ou salvar em PDF" e "Baixar em Word" no mesmo
  lugar em todos os documentos; impressão esconde o que não é do documento.
- **Privacidade:** o que não é guardado (perfil colado, áudio) é dito na tela.
