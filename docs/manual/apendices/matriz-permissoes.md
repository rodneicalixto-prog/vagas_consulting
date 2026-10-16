# Matriz de permissões

> **Estado:** rascunho, extraído do código (`src/lib/auth/internal.ts` e do
> menu em `src/components/admin-shell.tsx`) em 15/10/2026. `[A VALIDAR]` com
> uma conta de cada papel.

## Os quatro papéis internos

| Papel | Quem é | Alcance |
|---|---|---|
| **Superadmin** | A plataforma (dono do negócio) | Todas as empresas e todos os dados |
| **Administrador** | Equipe de operação da plataforma | Todas as empresas, sem a gestão de acesso e integrações da plataforma |
| **Administrador da empresa** | Gestor do cliente | Só a própria empresa e os próprios operadores |
| **Operador** | Recrutador do cliente | Só as empresas da sua **carteira**; vagas sigilosas só com acesso de confiança |

O **candidato** usa a parte pública e o aplicativo do candidato; não entra no
painel.

## Alcance dos dados (escopo)

| Papel | Vê |
|---|---|
| Superadmin e Administrador | tudo |
| Administrador da empresa | a própria empresa, inclusive vagas sigilosas dela |
| Operador | empresas da carteira; vagas sigilosas só se tiver acesso de confiança; só as próprias conversas e a fila de candidatos |

## Menu por papel

Legenda: ● vê · — não vê.

| Menu | Operador | Admin da empresa | Administrador | Superadmin |
|---|---|---|---|---|
| Visão geral | ● | ● | ● | ● |
| Conversas | ● | ● | ● | ● |
| Agenda: minha agenda, entrevistas, por etapa, entregas | ● | ● | ● | ● |
| Agenda da equipe | — | ● | ● | ● |
| Candidatos, contatos, talentos, convites | ● | ● | ● | ● |
| Ranking | — | — | ● | ● |
| Empresas e cadastro de vagas | ● | ● | ● | ● |
| Operadores | — | ● | ● | ● |
| Prestações | — | ● (a da empresa, leitura) | ● | ● |
| Leads | — | — | ● | ● |
| Black list | — | ● (a da empresa) | ● | ● |
| Denúncias, LGPD, Auditoria | — | — | ● | ● |
| Integrações | — | ● (chave de IA da empresa) | — | ● |
| Números de WhatsApp | — | ● (os da empresa) | — | ● |
| Agente de IA e base de conhecimento | — | — | — | ● |
| Carteira, Acesso | — | — | — | ● |
| Estratégico | ● (da carteira) | ● (da empresa) | — | ● |
| Indicadores de R&S | ● | ● | ● | ● |

## O que cada papel faz no ciclo de R&S

Todas as telas dentro da vaga (critérios, divulgação, triagem, entrevista,
testes, laudo, devolutiva, abordagem e carta-oferta) exigem a permissão de
gerir vagas, que os quatro papéis têm, **sempre limitada ao escopo acima**.

| Ação | Operador | Admin da empresa | Administrador | Superadmin |
|---|---|---|---|---|
| Gerar critérios, divulgação, triagem, roteiro, testes, laudo, devolutiva, carta, abordagem | ● | ● | ● | ● |
| **Publicar vaga** | — | — | ● | ● |
| Aprovar empresa | — | — | ● | ● |
| Ver o laudo, a ficha ou a carta de outra pessoa | — (só os que criou) | ● | ● | ● |
| Criar número de WhatsApp | — | ● (até o limite) | — | ● (sem limite) |
| Ajustar o limite de números | — | — | — | ● |
| Aprovar notas do agente de IA | — | — | — | ● |

## O que ninguém vê

- **Candidato** nunca vê laudo, ficha de parecer, notas de teste, triagem nem carta em rascunho.
- **Operador** não exporta contatos nem vê telefone ou e-mail fora da conversa aberta.
