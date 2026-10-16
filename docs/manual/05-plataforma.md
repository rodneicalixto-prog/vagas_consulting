# 5. Plataforma (superadmin e administrador)

> **Estado:** rascunho (código e specs em 15/10/2026). Tudo `[A VALIDAR]`.
> O que depende de conferir a tela está marcado **a escrever**.

## 5.1 Empresas

**Onde fica.** `Empresas e vagas → Empresas`.
Lista os clientes e contratantes. A empresa passa por estados: **rascunho**,
**em análise**, **ajustes**, **aprovada**, **suspensa** e **bloqueada**. Só o
administrador e o superadmin **aprovam** empresa.

Cadastro: razão social, fantasia, CNPJ, telefone, e-mail, endereço completo
(o CEP preenche logradouro, bairro, cidade e UF) e o **responsável** (nome
obrigatório). **a escrever:** rótulos exatos dos botões de aprovação.

## 5.2 Carteira por atendente

**Onde fica.** `Plataforma → Carteira`.

Define **quais empresas cada operador enxerga**. Operador sem empresa
atribuída **não vê nada**. A coluna **Confidenciais** libera o acesso de
confiança às vagas sigilosas. O administrador da empresa aparece destacado.
Para incluir uma pessoa, convide-a em **Acesso** com o perfil Operador.

## 5.3 Acesso e permissões

**Onde fica.** `Plataforma → Acesso`. Perfis, permissões, autenticação forte,
sessões e segregação de funções. Veja a
[matriz de permissões](apendices/matriz-permissoes.md). **a escrever:** passo a
passo de convite e troca de perfil.

## 5.4 Integrações e cofre de chaves

**Onde fica.** `Plataforma → Integrações`.

| Provedor | Para quê |
|---|---|
| OpenAI, Claude, Groq | Agente de IA, geração de textos e transcrição de áudio |
| Evolution API | WhatsApp: URL e chave na plataforma, uma instância por número |
| Resend | E-mail |
| SMS, Telegram | Lembretes e alertas |

- As chaves ficam **cifradas** no cofre; depois de salvas aparecem só como
  `••••` e os 4 últimos caracteres.
- **Testar conexão** confere a chave sem enviar mensagem.
- Sem a **chave-mestra** configurada no servidor, nada é gravado nem lido.
- Cada empresa pode usar a **própria chave de IA**; sem ela, usa a da
  plataforma (e o custo é da plataforma).

## 5.5 Agente de IA e base de conhecimento

**Onde fica.** `Plataforma → Agente de IA` (só superadmin).

**O agente:** liga e desliga, nome, tom (formal ou próximo), provedor e modelo,
**roteiro** e **teto mensal de custo** (padrão US$ 100). Autonomia: apenas
sugestão, ou atende sozinho. Cada **número de WhatsApp** ainda tem o seu modo
(desligado, só sugestão ou automático).

**A base:** notas de tipo **política**, **roteiro**, **pergunta frequente**,
**vaga** e **lição**, com estado **rascunho**, **aprovada** ou **arquivada**.
Só nota **aprovada e em vigor** entra no agente.

| Controle | O que faz |
|---|---|
| **Vale até** | Nota vencida sai do agente e não se aprova sem renovar a data |
| **Dono** | Responsável por manter a nota |
| Painel **Confiabilidade da base** | Vencidas, a revisar, **conflitos** e **cobertura** |
| **Lições** | O agente aprende com o que a equipe edita ou responde; você aprova em lote |
| Qualidade por nota | Em quantas respostas a nota foi enviada e a taxa de "usada sem edição" (é correlação) |
| **Exportar para o Obsidian (.zip)** | Cópia das notas aprovadas |

**Ajuda Vagas Consulting.** Na mesma tela, a caixa **Assistente ligado** liga
e desliga a ajuda de funcionamento da equipe. **Lacunas da Ajuda** mostra o
que a equipe perguntou e o assistente não resolveu, para virar tópico do manual.

## 5.6 Números de WhatsApp e limites

O passo a passo está em [4.2](04-admin-empresa.md). Como plataforma, você
também **ajusta o limite de números** de cada empresa (modelo de aluguel) e
cria números sem esse limite.

## 5.7 LGPD, denúncias e auditoria

| Tela | O que faz |
|---|---|
| **LGPD** | Solicitações dos titulares: acesso, correção, exportação, revogação, eliminação e revisão de decisão automatizada |
| **Denúncias** | Cobrança indevida, discriminação, assédio, dado falso e outras |
| **Auditoria** | Quem alterou o quê e quando, com exportação |

**a escrever:** prazos e fluxo de resposta de cada solicitação.

## 5.8 Leads e ranking

- **Leads:** cadastro mínimo capturado na instalação do aplicativo.
- **Ranking:** quem mais se candidata, vagas mais disputadas e volume por
  empresa (o mesmo candidato pode concorrer a várias vagas).

## O que a plataforma não faz

- **Não mostra segredo** depois de salvo e não o registra em log.
- **Não aprova nota** do agente sozinha.
- **Não deixa** o administrador da empresa ou o operador alterar a plataforma.

## Veja também

- [Matriz de permissões](apendices/matriz-permissoes.md)
- [Regras de ouro](apendices/regras-de-ouro.md)
