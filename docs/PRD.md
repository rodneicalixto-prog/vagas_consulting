# Documento de Requisitos do Produto (PRD)

> **Projeto:** Vagas Consulting (`rodneicalixto-prog/vagas_consulting`) · **App:** v0.1.0 · **Documento:** PRD v1.6 · **Data:** 14/10/2026 · **Status:** rascunho retroativo, lido antes de construir (ver `docs/README.md`)


> Rascunho gerado a partir do código real do repositório (`vagas_consulting`),
> do `PROJETO.md` e do `CLAUDE.md` deste projeto — não é um documento do zero,
> é a leitura do que já está construído e decidido, com os campos que
> continuam em aberto marcados como tal. Ver seção "Perguntas em aberto".

## Nome do produto e ideia em uma frase

**Vagas Consulting** — marketplace de vagas de emprego (efetivas, PJ e
temporárias) operado pela própria Vagas Consulting: empresas não publicam
vaga diretamente, elas solicitam e a equipe interna cadastra e publica.

## Usuários-alvo

- **Candidato** — pessoa física buscando vaga efetiva, PJ ou temporária.
  Usa um PWA instalável (`/inicio`, `/vagas`, `/processos`, `/mensagens`,
  `/perfil`).
- **Empresa/recrutador** — solicita vagas e acompanha pipeline. *(Nota: o
  portal de empresa em rotas próprias foi retirado do código em versão
  anterior — ver `PROJETO.md` seção 8, item 1, "Retirar o portal
  empresarial do código". Hoje a interação da empresa é via
  operação interna, não self-service.)*
- **Equipe interna Vagas Consulting** — três papéis (`admin_perfil`):
  `superadmin`, `admin`, `operador`. Cadastra empresas, publica vagas,
  gerencia pipeline de candidatos, modera denúncias, atende solicitações
  LGPD, acompanha prestações de temporários.

## Problema e solução improvisada de hoje

**Antes do app:** a operação era feita em **planilha** (resposta do Rodnei, 14/10/2026).

## Objetivo e medida de sucesso

**Sinal de sucesso (decisão de 14/10/2026):** indicador combinado, no início, de **vagas cadastradas**, **interações de candidatos** (candidaturas) e **volume de apps baixados** (`app_install_events`). **Metas numéricas variáveis (Rodnei, 14/10/2026):** dependem da campanha de divulgação da ferramenta; serão definidas a cada campanha, não há alvo fixo.

## Funcionalidades principais

| Funcionalidade | Benefício | Prioridade | Status |
|---|---|---|---|
| Cadastro/login de candidato | Acesso ao app | Essencial | ✅ Construído |
| Perfil, currículo, experiências, documentos | Base de dados pro pipeline | Essencial | ✅ Construído |
| Agente de IA pra ler currículo anexado e pré-preencher o perfil | Reduz preenchimento manual | Essencial | ✅ Construído (`src/lib/ai/curriculo.ts`) |
| Busca e candidatura a vagas (efetiva/PJ/temporária) | Núcleo do produto | Essencial | ✅ Construído |
| Convite direto pra temporário (fora do fluxo de candidatura) | Agilidade em demanda pontual | Essencial | ✅ Construído em 14/10/2026 (`/convites`, `/admin/convites`), ainda não publicado — antes disso só existia a tabela `invites` |
| Mensagens candidato↔operação | Comunicação no pipeline | Essencial | ✅ Construído |
| Agenda de entrevistas/compromissos da equipe interna | Organização operacional | Alta | ✅ Construído |
| Painel admin: empresas, vagas, candidatos, blacklist | Operação do marketplace | Essencial | ✅ Construído |
| Auditoria com exportação | Rastreabilidade | Alta | ✅ Construído |
| LGPD: consentimentos por canal + solicitações do titular | Compliance obrigatório | Essencial | ✅ Construído |
| Denúncias (assédio, discriminação, cobrança indevida, dado falso) | Segurança da plataforma | Alta | ✅ Construído |
| Prestações de temporários (status de pagamento) | Controle financeiro básico | Média | ✅ Construído |
| Leads via Meta Ads (webhook) | Captação de candidatos | Média | ✅ Construído (`/api/webhooks/leads/meta`) |
| Arquivamento automático de vagas expiradas (cron diário) | Higiene do catálogo | Média | ✅ Construído — **estava quebrado em produção até 28/09/2026 (migration nunca aplicada), corrigido nesta sessão** |
| Recuperação de senha | Acesso básico esperado | Essencial | ❌ **Não implementado** |
| MFA administrativo | Segurança do painel (PII de candidatos) | Alta | ❌ **Não implementado** (campo `mfa_ativo` existe na UI, sem fluxo real) |
| Agente de IA + WhatsApp (Evolution API + n8n) para triagem/vídeo-entrevista | Expande canal de atendimento | Próxima fase (Rodnei, 14/10/2026) | ⬜ Planejado, não iniciado (ver `PROJETO.md` seção 8.0) — Rodnei pediu explicitamente pra não começar sem plano próprio |

## Carteira por atendente e vagas confidenciais (v1.4, 14/10/2026)

**Problema.** O Rodnei capta vagas e faz as tratativas pela IA para duas
empresas de ramos e CNPJs diferentes (**Athenas** e **ePró Estética**), cada uma
com um operador próprio que dá continuidade. Hoje todo operador vê todas as
empresas.

**Objetivo.** Cada operador enxerga e trata **somente** a(s) empresa(s)
atribuída(s) e ativa(s) para ele; **admin** e **superadmin** mantêm a visão geral.

**Perfis**

| Perfil | Escopo | Pode |
|---|---|---|
| superadmin | Tudo | Tudo, incluindo contas, carteira e confidencialidade |
| admin | Tudo (como o superadmin) | Operar, publicar, ver valores e prestações |
| operador | Só a carteira ativa | Cadastrar vaga (rascunho), atender candidatos e convites da carteira. **Não** publica, **não** vê valores/prestações |

**Operador de confiança.** Profissional do Rodnei (ou outro) que também vê
**vagas confidenciais** (gerência, altos cargos, sigilo da empresa). O
funcionário da empresa cliente é operador comum e **não** as vê.

**Vaga confidencial.** Oculta do operador comum (vaga, candidaturas, convites e
contagens). Ao candidato aparece como "Empresa confidencial" até a candidatura
chegar à etapa de entrevista.

**Critérios de aceite:** ver `specs/CARTEIRA_ATENDENTE.md` (§7).

**Fora do escopo agora:** multi-tenant, cobrança e white-label
(`DIAGNOSTICO_MULTIUSUARIO_WHITELABEL.md`).

## Fora da versão 1

Conforme documento fonte (`Planejamento_Aplicativo_de_Vagas.docx`, seção 3):
folha de pagamento, assinatura eletrônica com validade jurídica específica,
emissão fiscal, ponto oficial, verificação de antecedentes, planos pagos,
matching avançado.

## Histórias de usuário (amostra do que já está implementado)

- Como **candidato**, eu quero anexar meu currículo e ter meus dados
  pré-preenchidos por IA, para não digitar tudo manualmente.
- Como **candidato**, eu quero ver o status da minha candidatura em
  `/processos`, para acompanhar sem precisar perguntar.
- Como **operador**, eu quero cadastrar uma vaga solicitada por uma empresa
  e publicá-la, para que candidatos possam se candidatar.
- Como **admin**, eu quero ver o log de auditoria e exportá-lo, para
  responder a uma investigação ou solicitação LGPD.
- Como **candidato**, eu quero registrar uma denúncia sobre uma vaga ou
  empresa, para reportar cobrança indevida, discriminação ou assédio.

## Critérios de aceite (amostra)

- Dado um candidato logado sem currículo cadastrado, quando ele anexa um
  PDF/imagem em `/perfil/documentos`, então o agente de IA extrai
  experiências e preenche `profiles.experiencias_profissionais`.
- Dado um operador no painel `/admin/vagas`, quando ele decide "publicar"
  uma vaga em `revisao`, então o status muda pra `publicada` e
  `publicada_em` é registrado.
- Dado uma vaga `publicada` com `expira_em` no passado, quando o cron
  `/api/cron/archive-jobs` roda, então o status muda pra `arquivada`.

## Perguntas em aberto

Estas não têm resposta em nenhum `.md` do repositório nem no `PROJETO.md`
— preciso que você decida ou me dê a informação, não vou inventar:

1. Qual é a métrica de sucesso do MVP (ver "Objetivo e medida de sucesso")?
2. Qual era o processo antes do sistema existir (ver "Problema e solução
   improvisada de hoje")?
3. As 10 decisões de negócio da seção 7 do `PROJETO.md` (nome definitivo,
   área geográfica, quem é o empregador legal em cada modalidade, se
   candidato paga algo, quem calcula pagamento de temporário, quais
   setores entram no piloto, quem administra denúncias/incidentes) —
   4 dessas 10 já têm decisão registrada (ver seção 7 do `PROJETO.md`); as
   outras 6 continuam abertas.
4. Prazo/critério pra decidir retomar a fase "Agente de IA + WhatsApp"
   (seção 8.0 do `PROJETO.md`) — Rodnei disse explicitamente que não é
   pra começar sem sinal dele.

## Atualização v1.5 (14/10/2026) — núcleo da carteira em produção

- **Em produção:** carteira por atendente, vagas confidenciais, banco de
  talentos filtrado, convite de 72 h, ranking de candidaturas e linha do
  tempo da candidatura (commit `770ab29`).
- **Decisões do Rodnei:** operador não publica nem encerra vaga publicada
  (só admin/superadmin); contato do candidato só com candidatura em
  andamento; convite vencido libera o candidato; candidato pode concorrer a
  várias vagas e empresas; **black list segue global** (por empresa fica
  para uma versão futura).
- **Em aberto:** teste de isolamento com operadores reais (Athenas e ePró);
  black list por empresa contratante.

## Atualização v1.6 (15/10/2026)

- **Vitrine pública:** lista e detalhe das vagas abrem sem login; candidatar-se
  exige conta e volta à mesma vaga; cadastro incompleto navega home e vagas.
- **Hierarquia de 4 níveis:** superadmin, admin da plataforma, **admin da
  empresa** (limite de operadores definido só pelo superadmin) e operador.
- **Black list por empresa**, cadastrada pelo admin da empresa; a global segue da plataforma.
- **Vagas:** pausar e reativar (só quem publica); canceladas; sigilosas por empresa.
- **Comunicação:** inbox de WhatsApp via Evolution; descadastro e consentimento
  obrigatórios; agente de IA em modo sugestão (ainda não construído).
- **Integrações:** cofre de chaves (OpenAI, Claude, Groq, Evolution, Resend, SMS, Telegram).
- **Em aberto:** teste com pessoas reais (isolamento, inbox); SMS; Resend;
  agente de IA; etapa Exame médico.
