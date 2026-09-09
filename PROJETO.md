# Vagas Consulting — App de Vagas

Projeto novo e independente do kit `KPA-calixto`. Este documento consolida
o planejamento (`Planejamento_Aplicativo_de_Vagas.docx`) e o protótipo já
produzido, e serve de referência única para as próximas fases técnicas.

## 1. Visão

Plataforma de recrutamento com três ambientes conectados:

- **App do candidato** — busca, candidatura, acompanhamento de processos,
  trabalhos temporários, mensagens, perfil e privacidade.
- **Portal da empresa/recrutador** — cadastro, publicação de vagas,
  pipeline de seleção, gestão de temporários.
- **Painel administrativo** — moderação, LGPD, auditoria, permissões,
  suporte.

Modalidades suportadas desde o MVP: **Efetiva (CLT)**, **PJ** e
**Temporária**, cada uma com campos obrigatórios e avisos próprios (aba
"Regras da vaga").

## 2. Estado atual

| Item | Status |
|---|---|
| Documento de planejamento funcional/técnico | ✅ Recebido (`Planejamento_Aplicativo_de_Vagas.docx`, v1.0) |
| Logo da marca | ✅ Recebida |
| Protótipo visual do app do candidato (10 telas, MVP) | ✅ Publicado — [artifact](https://claude.ai/code/artifact/d04929f9-7fcc-4f91-a8fa-4308140eede4) |
| Protótipo do portal da empresa | ⬜ Não iniciado |
| Protótipo do painel administrativo | ⬜ Não iniciado |
| Repositório de código | ✅ Criado — [rodneicalixto-prog/vagas_consulting](https://github.com/rodneicalixto-prog/vagas_consulting) |
| Scaffold Next.js do app do candidato | ✅ Pronto localmente — aguardando autorização de commit/push |
| Infraestrutura (deploy, domínio, banco) | 🔶 Em andamento — projeto Supabase criado |

## 2.1 Infraestrutura

| Item | Referência |
|---|---|
| Repositório GitHub | [rodneicalixto-prog/vagas_consulting](https://github.com/rodneicalixto-prog/vagas_consulting) |
| Projeto Supabase (URL) | `https://tfipbxjslpxbaybpxsql.supabase.co` |
| Deploy (Vercel) | ⬜ Não criado — a fazer sem domínio próprio por enquanto (subdomínio `*.vercel.app`) |
| Domínio próprio | ⬜ Ainda não definido |

> Segurança: só a URL pública do projeto Supabase está registrada aqui.
> Nenhuma chave de API, service role key ou connection string deve ir
> neste arquivo — elas vão para `.env` (gitignored), conforme a regra de
> segurança do `CLAUDE.md`.

## 3. Escopo do MVP (do documento, seção 3)

**Incluído:** login/perfis/currículo/busca/candidatura/convite/favoritos/
alertas · cadastro e validação de empresas · publicação de vagas ·
pipeline de seleção, mensagens, notificações · aceite/check-in/conclusão
de temporários · painel admin, moderação, permissões, auditoria, LGPD e
exportações essenciais.

**Fora do MVP:** folha de pagamento, assinatura eletrônica com validade
jurídica específica, emissão fiscal, ponto oficial, verificação de
antecedentes, planos pagos, matching avançado.

## 4. Arquitetura técnica recomendada (do documento, seção 11)

| Camada | Recomendação |
|---|---|
| Interfaces | Web app responsiva, instalável como PWA no MVP; portal empresa/admin por papéis; apps nativos depois |
| Backend | API modular (auth, vagas, candidaturas, mensagens, consentimentos, arquivos, notificações, auditoria) |
| Banco | PostgreSQL com isolamento lógico por empresa; Supabase é opção, não decisão fechada |
| Arquivos | Storage privado, URLs temporárias, varredura, política de retenção |
| Busca | Busca nativa do Postgres no MVP |
| Mensageria | Fila de tarefas (e-mail, WhatsApp/SMS, arquivos, webhooks) |
| Observabilidade | Logs estruturados, métricas, alertas, auditoria separada |

## 5. Backlog priorizado (do documento, seção 13)

**P0** — Identidade e acesso · Perfil e currículo · Empresas e validação ·
Vagas e regras · Candidatura e pipeline · LGPD e preferências · Admin e
auditoria.

**P1** — Mensagens e agenda · Temporários · Relatórios.

**P2** — Matching e automação · Pagamentos e extratos.

## 6. Compliance obrigatório (LGPD)

- Opt-in de alertas de vagas **separado por canal** (WhatsApp/E-mail/SMS),
  desmarcado por padrão, revogável.
- Termos de uso e aviso de privacidade tratados como controles distintos
  (aviso ≠ consentimento genérico).
- Registro de prova de consentimento (finalidade, canal, versão do texto,
  data/hora, origem, revogação).
- Direitos do titular acessíveis no próprio app: acesso, correção,
  exportação, revogação, eliminação, revisão de decisão automatizada.
- Textos jurídicos finais dependem de validação por assessoria jurídica
  antes da publicação (o documento original já sinaliza isso).

## 7. Decisões pendentes antes de avançar (do documento, seção 16)

Estas perguntas do próprio documento ainda não têm resposta registrada e
bloqueiam decisões de produto/arquitetura importantes:

1. Nome definitivo e área geográfica inicial do produto.
2. Marketplace aberto ou operado por uma agência/empresa específica?
3. Quem é o empregador/contratante/intermediador em cada modalidade?
4. Empresas publicam direto ou toda vaga passa por moderação?
5. O candidato paga algo? (recomendação do documento: não cobrar)
6. Pagamento de temporários dentro da plataforma — quem calcula/aprova?
7. Quais dados/documentos são realmente necessários em cada etapa?
8. WhatsApp é só alerta ou também atendimento/candidatura?
9. Quais setores/tipos de vaga entram no piloto?
10. Quem administra aprovação, suporte, denúncias, privacidade, incidentes?

## 8. Próximas fases propostas

1. Prototipar portal da empresa e painel admin (mesmo padrão visual).
2. Definir stack final e criar repositório de código.
3. Modelar banco de dados (entidades da seção 7.3 do documento original).
4. Montar infraestrutura (deploy, domínio, ambientes).
5. Construir o MVP por fase (Descoberta → Design → Construção → Piloto →
   Lançamento, conforme seção 14 do documento original).

## Referências

- `Planejamento_Aplicativo_de_Vagas.docx` (documento fonte, v1.0)
- Protótipo do app do candidato: https://claude.ai/code/artifact/d04929f9-7fcc-4f91-a8fa-4308140eede4
