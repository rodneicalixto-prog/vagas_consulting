# Especificação — Integrações: cofre de chaves e canais (Fase A)

> **Projeto:** Vagas Consulting · **Documento:** Spec das integrações v1.0 · **Data:** 14/10/2026
> **Status:** construída (Fase A). Complementa `specs/COMUNICACAO_OMNICANAL.md`.

## 1. O que existe

Tela **Integrações** (`/admin/integracoes`) com cofre de credenciais cifradas e
botão **Testar conexão**.

| Provedor | Para quê | Quem configura | Teste automático |
|---|---|---|---|
| OpenAI | Agente de IA | Superadmin (plataforma) e empresa (chave própria) | Sim |
| Claude (Anthropic) | Agente de IA | Idem | Sim |
| Groq | Agente de IA (econômico) | Idem | Sim |
| Evolution API | WhatsApp: URL e chave na plataforma; **instância por empresa** | Superadmin | Sim (inclui estado da instância) |
| Resend | E-mail | Superadmin | Sim |
| SMS | Lembrete e reforço | Superadmin | Ainda não (provedor a definir) |
| Telegram (bot) | Alertas | Superadmin | Sim (`getMe`) |

## 2. Escopos e herança

- **Plataforma:** uma credencial por provedor.
- **Empresa:** chave de IA própria (BYOK) e nome da instância do WhatsApp.
- Empresa sem chave própria usa a da plataforma (custo da plataforma).
- **Admin da empresa:** só vê e altera a chave de IA da própria empresa.
- **Superadmin:** tudo, escolhendo "Plataforma" ou a empresa.

## 3. Segurança

| Controle | Detalhe |
|---|---|
| Cifra | AES-256-GCM na aplicação; o banco só recebe `v1:iv:tag:texto` |
| Chave-mestra | Variável `INTEGRATIONS_ENCRYPTION_KEY` (32 bytes em base64), só no servidor; sem ela, nada é gravado |
| Campo só de escrita | A tela mostra `••••` + 4 últimos caracteres; o segredo nunca volta ao navegador |
| Auditoria | `integracao_cadastrada/atualizada/testada/removida`; nunca registra o segredo |
| Empresa vem da sessão | O admin da empresa não escolhe empresa; não toca na plataforma |
| SSRF | URL da Evolution: https obrigatório, sem IP privado, loopback, link-local, `localhost`, `.internal`, credenciais embutidas |
| Teste | Chamadas leves, somente leitura, com tempo limite de 8 s; erros sem expor a chave |

## 4. Como ativar (uma vez)

1. Gerar a chave-mestra: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
2. Cadastrar na Vercel como variável **`INTEGRATIONS_ENCRYPTION_KEY`** (Production, tipo sensível) e fazer um novo deploy.
3. Guardar uma cópia da chave-mestra em local seguro: **sem ela, as chaves gravadas não podem ser lidas** (é preciso recadastrá-las).

## 5. Limites conhecidos

- O consumo mensal e o bloqueio pelo teto só valem quando o agente de IA estiver ativo; hoje o teto é registrado.
- O teste da Evolution confirma a chave e o estado da instância, não envia mensagem.
- Rotacionar a chave-mestra exige recadastrar as credenciais.
- Resolução de DNS que aponte a hostname público para IP interno não é bloqueada (só o superadmin cadastra a URL).
