# Agente hunter — preparação e especificação inicial (v0.1, rascunho)

> **Projeto:** Vagas Consulting · **Data:** 26/10/2026 · **Uso:** próprio, não produto à venda.
> Origem: `Apresentação Gent.IA Out.26.pdf` (agente 01, Hunting). O PDF só mostra o cartão do
> agente, sem dizer como ele capta os currículos: o funcionamento abaixo é proposta nossa.
> Regra do projeto: documentos antes do código. **Nada foi construído.**

## 0. Campo para guardar os acessos (construído localmente em 26/10/2026)

O "caminho" pedido pelo Rodnei é um **campo no próprio Vagas** (`/admin/integracoes`, grupo "Plataformas de emprego (hunter)")
para guardar o acesso de Vagas.com, InfoJobs e LinkedIn, no cofre cifrado já existente (AES-256-GCM). Tipo de acesso:
chave de API ou usuário e senha. O valor **nunca volta para a tela**; senha não mostra nem os últimos caracteres; o uso
automático fica **desligado** até a pessoa marcar, depois de confirmar com a plataforma que os termos permitem. No LinkedIn
só se guarda token de API de parceiro: usuário e senha são recusados. Usar conta dedicada ao hunter, não a principal.
O hunter não passa por verificação em duas etapas nem por CAPTCHA. Migration `0050` (amplia a lista de provedores), **não aplicada**.

## 1. Regra de ouro: nunca trazer login e senha ao assistente

Login e senha **não passam pelo chat** nem pelo assistente. Motivos:
- O assistente não digita senha de ninguém, e credencial colada no chat vira risco (histórico, logs).
- Entrar nas plataformas com a sua conta por um robô é a rota C do plano (viola os termos e pode
  **banir a sua conta**). Está descartada.
- Regra permanente do projeto: segredo vai para o `.env` ou para o cofre de integrações do painel
  (`/admin/integracoes`, criptografado), nunca em texto solto.

**O que você traz em vez disso:** respostas do comercial de cada plataforma, uma exportação de
teste e, **se houver API oficial**, a chave colada por você no painel de integrações.

## 2. Plataformas: o que fazer em cada uma

Informações conferidas em 26/10/2026 em fontes públicas; **preços e limites mudam, confirme com a plataforma**.

| Plataforma | O que existe para empresa | O que fazer |
|---|---|---|
| **Vagas.com** | Plano pago "Vagas For Business", sob consulta. A política de privacidade diz que empresas buscam candidatos no banco conforme o nível de privacidade que cada candidato escolheu. Cita banco de talentos, IA e integração com outras plataformas | Pedir cotação e fazer as perguntas da seção 3 |
| **InfoJobs** | Empresa paga por anúncio e acesso ao banco de currículos. Fonte de terceiros cita pacote premium a partir de R$ 199,99 (pode estar desatualizado). Um relato de 2026 sugere que o acesso a currículos pode depender de ter anúncio ativo | Conferir o plano no site oficial, confirmar a regra do anúncio ativo e fazer as perguntas da seção 3 |
| **LinkedIn** | Os termos proíbem robôs, scripts e extensões que copiem dados ou enviem mensagens (cláusula 8.2, segundo fontes secundárias). APIs oficiais existem só por programa de parceiros | **Não automatizar.** Uso manual (Recruiter, se contratar). Perguntar à LinkedIn sobre parceria/API. Trazer perfis por colagem, uma pessoa por vez |

## 3. Perguntas para o comercial (as mesmas para Vagas.com e InfoJobs)

1. O plano permite **exportar** currículos (CSV, PDF, API) ou só ver na tela?
2. Existe **API ou integração** para empresa? Com chave própria?
3. Há **limite** de visualizações, exportações ou contatos por mês?
4. Os termos permitem **contatar o candidato fora da plataforma** (e-mail, WhatsApp) e usar **IA** sobre o currículo?
5. O acesso ao banco **depende de ter vaga anunciada ativa**?
6. O candidato é informado de que a empresa viu o currículo? Há **opt-out** que a plataforma já aplica?
7. Qual contrato rege o **tratamento do dado pessoal** (LGPD): quem é controlador e quem é operador?

Se a resposta à 4 for "não", essa plataforma entra só para uso manual, sem IA sobre o currículo.

## 4. O que trazer de volta

| Traga | Para quê |
|---|---|
| As respostas às 7 perguntas, por plataforma | Definir quais rotas são permitidas |
| **Exportação de teste** de 5 a 10 candidatos reais (se o plano permitir exportar) | Eu construo a importação sobre o formato verdadeiro |
| Nome do plano contratado e o que ele inclui | Registrar limites no projeto |
| **Chave de API, se existir** | Você cola em `/admin/integracoes`; eu **não** vejo o valor |

**Nunca traga:** login, senha, código de verificação, cookie de sessão, token pessoal.

## 5. Fluxo do hunter (proposta)

```
Vaga com critérios e regras da IA
  → Caçar: importa a exportação, ou cola o perfil, ou busca em fonte permitida
  → Score às cegas contra os critérios; só "alto fit" vira prospect
  → IA redige abordagem curta com link rastreado da vaga (origem = hunter_<fonte>)
  → Pessoa aprova o envio em lote (primeiras semanas), por WhatsApp, e-mail ou InMail (§6A)
  → Candidato clica, cadastra e se candidata → funil normal (triagem, validação, entrevista por IA)
```

Reaproveita: abordagem ativa (rascunho, follow-ups, "não contactar"), triagem às cegas, `origem`
da candidatura e black list.

## 6. LGPD e contato (resumo)

- Base legal: **legítimo interesse** (art. 7º, IX), com registro da avaliação. Parecer jurídico antes do primeiro envio real.
- No primeiro contato, dizer **de onde veio o dado** e por que a pessoa foi procurada (art. 9º).
- **Guardar o mínimo** (perfil profissional, sem dado sensível); **30 dias** de retenção para quem não responder.
- **Opt-out imediato** (reaproveita "não contactar" e black list). Pessoa que pede para sair nunca mais recebe contato.
- Vaga sigilosa: a abordagem **não cita a empresa**.

## 6A. WhatsApp para quem nunca falou com a gente (decidido pelo Rodnei em 26/10/2026)

O público vive no WhatsApp e no celular: o hunter **inclui WhatsApp** como canal. O risco que
existe (número bloqueado, reclamação, denúncia) vira requisito de desenho, não motivo para cortar o canal.

**Risco real, dito uma vez:** a política do WhatsApp Business exige consentimento (opt-in) para mensagem
iniciada pela empresa; mensagem sem isso derruba a qualidade do número e pode bloqueá-lo. A Evolution
(canal hoje no app) não é a API oficial: serve para volume baixo; para escalar, o caminho é a **API oficial
(Cloud API) com modelos aprovados**.

**Proteções embutidas (todas obrigatórias):**
1. **Número dedicado ao hunter.** Nunca o da operação, nem o de cliente (usa a estrutura de linhas já existente).
2. **Só telefone de fonte legítima:** exportação permitida pelo plano da plataforma ou candidato que se cadastrou. Nada de comprar lista nem raspar telefone.
3. **Teto diário e intervalo mínimo entre mensagens**, configuráveis; começa baixo e só sobe com taxa de reclamação baixa.
4. **Primeira mensagem curta e identificada:** quem somos, por que a pessoa foi procurada, de onde veio o dado, o link da vaga e **"responda SAIR para não receber mais"**. Vaga sigilosa: sem nome da empresa.
5. **SAIR (e variações) tem efeito imediato:** marca "não contactar" e registra opt-out; essa pessoa nunca mais recebe.
6. **Parada automática:** se a taxa de SAIR/bloqueio passar do limite, ou a linha cair ou for limitada, o envio pausa e você é avisado.
7. **Horário:** só dentro da janela das regras da vaga.
8. **Aprovação humana em lote** nas primeiras semanas; automatizar só depois de medir resposta e reclamação.
9. **Quem responde entra no fluxo normal:** a partir daí a conversa é do agente de atendimento, já com opt-in.

**Alternativa que reduz risco e mantém o WhatsApp:** primeiro toque por e-mail ou InMail com botão "falar no WhatsApp"
(`wa.me`): a pessoa inicia a conversa e ela deixa de ser fria. Fica disponível como opção por vaga.

## 7. Fases e o que é construído sem credencial

| Fase | Entrega | Depende de |
|---|---|---|
| H0 | Este documento e as decisões | — |
| **H1** | Tabela de prospects, importação (CSV ou colar perfil), score às cegas, abordagem com link rastreado e fila de aprovação | Nada: dá para construir já. O formato final da importação ajusta com a sua exportação de teste |
| H2 | Conector MCP de busca em fontes permitidas | Respostas da seção 3 e parecer jurídico |
| H3 | Envio automático por e-mail com opt-out | Taxa de resposta e de reclamação medidas na H1/H2 |

## 7A. H1 construída localmente (26/10/2026; migration `0051` NÃO aplicada)

Tela **Hunter** na vaga (`/admin/vagas/[id]/hunter`, etapa nova na trilha) com três passos:

1. **Trazer prospects:** planilha CSV colada (`;`, `,` ou tab; até 200 linhas; cabeçalho com telefone e/ou e-mail) ou uma pessoa por vez.
   O telefone e o e-mail são normalizados; do perfil saem família, endereço, telefone e e-mail. Quem pediu para sair (em qualquer vaga, por hash)
   e quem já está na vaga são pulados.
2. **Avaliar às cegas** contra os critérios da vaga (mesmo método da triagem, sem nome, idade ou contato). Só avalia: não contata ninguém.
   Encaixe alto, médio ou baixo. **Gerar mensagens** (WhatsApp ou e-mail) só para alto encaixe, ou alto e médio. Modelo **fixo e identificado**:
   quem somos, de onde veio o dado, link rastreado e "responda SAIR". Vaga sigilosa não cita a empresa.
3. **Aprovar e enviar:** cada mensagem passa por verificação (OK / Aviso / Bloqueia: link, saída, identificação, sigilo, termo discriminatório,
   promessa). A aprovação em lote respeita o **teto diário** (padrão 20, variável `HUNTER_TETO_DIARIO`) contando o que já foi enviado e o que
   já está aprovado. O envio é **manual**: botão "Abrir no WhatsApp" (`wa.me`) ou e-mail, pelo número dedicado, e depois "Marcar como enviado"
   (que confere opt-out, janela de horário da vaga e teto). **Nada sai sozinho nesta fase.**

**Rastreio:** link `/h/<token>` (sem dado pessoal na URL; prévia de link de WhatsApp não conta como clique) → cookie → candidatura grava a origem
`hunter_<fonte>` e marca o prospect como "candidatou-se". **SAIR** no WhatsApp (webhook) e "pediu para sair" na tela apagam os dados e bloqueiam o
contato para sempre. **Retenção:** rotina diária (`/api/cron/hunter-retencao`, 03:00 UTC) apaga em 30 dias nome, contato, perfil, avaliação e mensagem de
quem não se candidatou nem respondeu (**inclui quem só clicou**); quem se candidatou ou respondeu tem os dados de prospecção apagados após
180 dias sem movimento. Cada grupo é uma única escrita. Ficam só os hashes, e `nao_contactar` e `expirado` bloqueiam reimportação.
O SAIR e o bloqueio comparam o celular com e sem o nono dígito. Perfil vazio fica **sem nota** (nunca zero). Revisão de 26/10/2026.

**Não faz ainda:** coleta automática nas plataformas (H2), envio automático (H3), InMail, e usar o acesso guardado no cofre (o conector não existe).

## 8. Decisões assumidas (padrão; corrija se discordar) [A VALIDAR]

- Aprovação humana no envio na primeira fase.
- Canais: **WhatsApp (com as proteções da §6A)**, e-mail e InMail.
- Retenção de 30 dias para quem não responder.
- Rota LinkedIn: manual, sem automação.

---

## Fechamento

1. **O que foi feito ou decidido:** guia de preparação do hunter; regra de nunca trazer login ou senha; rota por plataforma (banco de currículos oficial como base, LinkedIn manual); fluxo e fases.
2. **O que está pendente:** respostas do comercial (7 perguntas) de Vagas.com e InfoJobs; exportação de teste; parecer jurídico sobre legítimo interesse; confirmação das decisões da seção 8.
3. **Próximo passo claro:** você pedir cotação e fazer as 7 perguntas às plataformas; em paralelo eu construo a H1 (importação, score às cegas e fila de aprovação), que não depende de credencial.
