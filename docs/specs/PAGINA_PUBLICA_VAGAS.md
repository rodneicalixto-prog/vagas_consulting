# Especificação — Página pública de vagas (v0.1)

> **Projeto:** Vagas Consulting · **App:** v0.1.0 · **Documento:** Spec da página pública de vagas v0.1 · **Data:** 27/10/2026
> **Status:** especificação aprovada em 27/10/2026. **P1, P2 e P3 publicadas em 27/10/2026.** Estende `VITRINE_PUBLICA.md` (14/10/2026). Pela regra dos seis documentos, nenhum código antes da aprovação do Rodnei.

## 1. Problema

O Rodnei apontou em 27/10/2026 que existem a página do admin e a do candidato, mas **não existe a página de publicação das vagas**. Conferido no código:

- **Admin** completo: lista de vagas, "Nova vaga", publicar, pausar e reativar, Central da vaga e aba Divulgação (texto por canal com link rastreado).
- **Candidato:** `/vagas` e `/vagas/[id]` são abertas a visitante, mas moram dentro do **app do candidato** (`src/app/(app)`), com o menu e o visual de aplicativo.
- **Divulgação:** o link rastreado que a aba Divulgação entrega (`/vagas/<id>?o=<canal>`) abre essa tela dentro do app.
- **Google:** não há `sitemap`, `robots`, metadados por vaga nem dados estruturados de vaga (limite já registrado em `VITRINE_PUBLICA.md` §6).

**Interpretação adotada (a confirmar):** "página de publicação" = **página pública onde a vaga publicada aparece para quem chega de fora**, pensada para ser divulgada e achada. Não é um novo formulário de cadastro de vaga no admin (esse já existe).

## 2. Objetivo e medida de sucesso

Quem recebe o link de uma vaga (Instagram, WhatsApp, LinkedIn, Google) vê uma página de vaga clara, sem a casca de aplicativo, e chega à candidatura em um clique.

Medidas, usando o que já existe (origem por canal, relatório `/admin/origens`): visitas por canal, candidaturas por canal e vagas indexadas pelo Google.

## 3. Escopo

**Dentro (3 fases):**

| Fase | Entrega |
|---|---|
| P1 | Layout público próprio para `/vagas` e `/vagas/[id]` (mesmos endereços), metadados por vaga, `sitemap.xml`, `robots.txt` e dados estruturados `JobPosting` |
| P2 | Busca e filtros no servidor (hoje o campo de busca é só visual) e paginação |
| P3 | Botão de compartilhar de verdade (copiar link, WhatsApp) e atalho "Ver página pública" na Central da vaga |

**Fora (por enquanto):** página por empresa, domínio próprio, formulário de candidatura direto na página, blog de carreiras, inscrição em alertas pela página.

## 4. Regras

| Regra | Detalhe |
|---|---|
| Endereços | Continuam `/vagas` e `/vagas/<id>`. Links já divulgados não quebram |
| Layout | Novo grupo de rotas público, **fora** de `(app)`: cabeçalho simples com a marca, rodapé com termos, sem menu do app. O modo visitante e a regra de cadastro incompleto de `(app)/layout.tsx` deixam de se aplicar a essas duas rotas |
| O que aparece | Só vaga `publicada` e dentro do prazo (`expira_em`). Vaga pausada, encerrada ou vencida responde 404 e sai do `sitemap` |
| Sigilo | Vaga `confidencial` mostra "Empresa confidencial" no HTML **e** nos dados estruturados. O nome real nunca sai do servidor |
| Dados pessoais | Nenhum. Colunas fixas, sem dado de candidato nem de operador |
| Candidatura | O botão leva a `/vagas/<id>/candidatura`, que continua exigindo conta. Visitante entra ou cria conta e volta à vaga (regra de `next`, `VITRINE_PUBLICA.md` §3) |
| Origem | O marcador `?o=<canal>` continua valendo e continua gravando a origem da candidatura. A URL canônica da vaga é **sem** o marcador |
| Indexação | `robots.txt` bloqueia `/admin`, `/api`, `/h/` e `/vagas/*/candidatura`. Páginas de vaga confidencial são indexáveis com a empresa mascarada (ver §6) |

## 5. Metadados e dados estruturados (P1)

- **Título da página:** `<cargo> em <cidade> | Vagas Consulting`. **Descrição:** primeiras ~155 letras do texto da vaga, sem quebra no meio da palavra.
- **Canonical** sem `?o=`. **Open Graph e Twitter** com título, descrição e a imagem da marca (para a prévia no WhatsApp e no LinkedIn).
- **`JobPosting` (JSON-LD)**, com os campos que o Google exige e que o app já tem:

| Campo | Origem |
|---|---|
| `title` | `jobs.titulo` |
| `description` | `jobs.descricao` (texto) |
| `datePosted` | `jobs.publicada_em` |
| `validThrough` | `jobs.expira_em` (omitido se nulo) |
| `employmentType` | `efetiva` → `FULL_TIME`; `pj` → `CONTRACTOR`; `temporaria` → `TEMPORARY` |
| `jobLocation` | `jobs.local` (cidade e UF quando for possível separar; senão, texto) |
| `hiringOrganization` | Empresa, ou **Vagas Consulting** quando a vaga é confidencial |
| `baseSalary` | Só quando houver faixa numérica informada e a vaga não for "a combinar" |

- **Não marcar como `JobPosting`** vaga fora do prazo ou sem descrição.

## 6. Decisão: vaga confidencial e Google (Rodnei, 27/10/2026)

O Google exige `hiringOrganization`. **Decidido:** vaga confidencial **é indexada**, com **Vagas Consulting** como organização (a plataforma opera a vaga) e "Empresa confidencial" no texto. Não usar `noindex` nessas vagas. A empresa real não aparece no HTML, no `JobPosting` nem no título e na descrição dos metadados.

Risco já registrado: o texto livre da descrição pode citar o nome da empresa. Há verificação no cadastro (`regras-vaga.ts`, termo de identificação da empresa) que avisa antes de publicar; a página pública **não** reescreve o texto.

## 7. Busca, filtros e paginação (P2)

- Parâmetros na URL: `q` (cargo ou palavra), `modalidade`, `cidade`, `pagina`.
- Consulta no servidor com limite por página (proposta: 20) e contagem total; hoje a lista carrega até 200 de uma vez.
- Estado da busca na URL, para poder compartilhar e para voltar do detalhe sem perder o filtro.
- Sem dado novo no banco; índice de busca de texto do Postgres só se a lentidão aparecer (decisão futura, com migration anunciada).

## 8. Compartilhar e admin (P3)

- **Compartilhar:** copiar link e abrir WhatsApp com texto e link já prontos. O link copiado leva `?utm_source=site` e o do WhatsApp leva `?o=whatsapp` (canal já existente); não foi criado canal novo, para não mexer na lista de canais da divulgação nem nos relatórios de origem.
- **Central da vaga:** botão "Ver página pública" e o estado da vaga (publicada, indexável, confidencial) em uma linha.

## 9. Critérios de aceite

1. `/vagas/<id>` de vaga publicada abre sem menu do app e mostra título, modalidade, local, remuneração (quando houver), descrição e botão de candidatura.
2. Vaga pausada, encerrada, vencida ou inexistente responde 404 e não aparece no `sitemap.xml`.
3. Vaga confidencial não mostra o nome da empresa na página nem no JSON-LD.
4. `robots.txt` bloqueia `/admin`, `/api`, `/h/` e a candidatura.
5. O JSON-LD valida na ferramenta de teste de resultados avançados do Google para uma vaga efetiva, uma PJ e uma temporária.
6. Link com `?o=instagram` continua gravando a origem na candidatura; o canonical não leva o marcador.
7. Visitante clica em candidatar-se, cria conta e volta à mesma vaga.
8. Prévia do link no WhatsApp mostra título e descrição da vaga.

## 10. Riscos e limites

- **Vazamento de empresa** por texto livre da descrição (aceito, revisão editorial do admin).
- **Indexação demora** e não é garantida; o sitemap ajuda, mas não força.
- **Sem slug:** a URL usa o UUID da vaga. URL amigável exigiria coluna nova e migration; fica fora desta etapa.
- **Dependência de domínio:** as URLs absolutas usam `NEXT_PUBLIC_SITE_URL` (padrão `https://sosvagas.sosmkt.com.br`, como em `hunter-servidor.ts`).

## 11. Perguntas em aberto

1. ~~A interpretação do §1 está certa (página pública de divulgação, e não outro cadastro de vaga)?~~ **Confirmado em 27/10/2026 (Rodnei):** é página pública de divulgação.
2. ~~Vaga confidencial: indexar ou `noindex`?~~ **Decidido em 27/10/2026:** indexar com "Vagas Consulting" como organização e a empresa mascarada (§6).
3. ~~A candidatura continua exigindo conta no app, ou haverá formulário rápido na página?~~ **Decidido em 27/10/2026 (Rodnei):** a candidatura continua exigindo conta, porque endereço obrigatório e consentimento ficam em um lugar só. Sem formulário rápido na página.
4. ~~Domínio: ficar no domínio atual, ou separar um endereço só para vagas?~~ **Decidido em 27/10/2026 (Rodnei):** fica no domínio atual (`sosvagas.sosmkt.com.br`) por enquanto. Endereço separado só se houver necessidade futura.
