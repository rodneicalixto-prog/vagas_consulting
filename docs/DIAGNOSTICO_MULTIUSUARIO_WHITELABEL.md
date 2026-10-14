# Diagnóstico — contas de atendimento, carteira de empresas e white-label

> **Projeto:** Vagas Consulting · **App:** v0.1.0 · **Documento:** Diagnóstico v1.0 · **Data:** 14/10/2026 · **Status:** análise para decisão do Rodnei; nada foi construído

## 1. O que eu entendi do pedido

Três ideias encadeadas, em ordem de distância:

| Camada | O que é | Prazo que você sinalizou |
|---|---|---|
| **A. Carteira por atendente** | Contas de atendimento ("operadores"): você **ativa** quem pode tratar de uma **carteira de empresas** e das vagas dela. Admin e Super Admin mantêm a visão geral | Próxima etapa |
| **B. Plataforma como serviço** | Poder **alugar** (assinatura) ou **vender** o uso da plataforma a terceiros | Futuro próximo |
| **C. White-label instalável** | **Instalador** para vender a plataforma inteira, com a marca do comprador | Futuro |

Em uma frase: sair de "um painel interno para uma operação" para "um produto que
outras operações usam, cada uma com sua equipe, suas empresas e sua marca".

## 2. Onde o app está hoje (fatos verificados no código e no banco)

| Tema | Situação |
|---|---|
| Perfis internos | `superadmin`, `admin`, `operador` em `admin_users`, com flag **`ativo`** (já existe para "ativar quem pode") |
| Permissões | 8 capacidades em `src/lib/auth/internal.ts`; `operador` pode empresas, vagas e funil, **não** publica vaga, auditoria nem usuários |
| Convite de equipe | `/admin/acesso` (só superadmin) cria contas por e-mail |
| **Carteira** | **Não existe.** `companies` não tem responsável; qualquer operador vê **todas** as empresas e vagas (o painel usa a chave de serviço sem filtro) |
| Responsável | `jobs.responsavel_id` existe, mas só grava **quem criou**; não filtra nada. Única tela com filtro por dono é a **agenda** |
| Multi-cliente | **Não existe.** Zero colunas `tenant/organization` nas 18 tabelas; as 21 políticas RLS tratam só candidato × operação |
| Marca | Fixa no código: nome em 6 arquivos (layout, manifest, textos), paleta nos tokens, logo em `public/` |
| Configuração | Só 4 variáveis de ambiente de negócio + Supabase; sem arquivo de configuração por cliente |
| Implantação | 1 projeto Supabase + 1 projeto Vercel, **feita à mão**; migrations em `supabase/migrations` (0001–0022) já reconstroem o banco (validado hoje) |
| Cobrança | Não existe (`service_engagements` registra prestação de serviço, não assinatura da plataforma) |

## 3. Diagnóstico por camada

### A. Carteira por atendente — **viável e pequeno**
**Lacuna:** falta o vínculo operador ↔ empresa e fazer o painel respeitar esse vínculo.

Mudança mínima:
1. Tabela `company_assignments (company_id, user_id, ativo, criado_por)`.
2. Regra única de visibilidade: `superadmin` e `admin` veem tudo; `operador` vê só empresas da sua carteira (e, por consequência, vagas, candidaturas, convites e prestações dessas empresas).
3. Tela "Carteira" para o superadmin atribuir e ativar/desativar.
4. Aplicar o filtro **na camada de servidor, em um só lugar** (um helper), não tela a tela.

**Risco principal:** hoje as 32 telas do painel consultam com chave de serviço. Se o filtro for esquecido em uma, o operador enxerga dado de fora da carteira. Por isso a regra deve ser um helper obrigatório (ou, melhor, política RLS com o usuário do operador).

### B. Alugar/vender a plataforma — **exige decisão de arquitetura**
Duas formas, com custos e riscos bem diferentes:

| | **B1. Uma instalação por cliente** (single-tenant) | **B2. Multi-tenant** (uma base para todos) |
|---|---|---|
| Como | Cada cliente tem seu próprio Supabase + Vercel + domínio | Todos na mesma base, separados por `tenant_id` |
| Isolamento de dados | **Total, por construção** | Depende de RLS e de nunca errar um filtro |
| LGPD | Mais simples: o cliente é o controlador dos próprios dados | Você vira operador de dados de vários controladores |
| Esforço de código | Baixo (o app já é single-tenant) | **Alto**: `tenant_id` em ~18 tabelas, reescrever RLS, auth por tenant, backup por tenant |
| Custo por cliente | Sobe (projeto Supabase/Vercel por cliente) | Desce |
| Operação | Mais instalações para atualizar | Uma só |
| Quando compensa | Poucos clientes, ticket alto, dados sensíveis | Muitos clientes pequenos |

**Minha leitura:** com dados pessoais de candidatos e poucos clientes no início, **B1 é o caminho** e é também o pré-requisito natural do C. B2 só vale se o número de clientes justificar.

### C. White-label com instalador — **consequência de B1**
O que o "instalador" precisa automatizar, e o que falta:

| Item | Estado | O que falta |
|---|---|---|
| Banco | Migrations reconstroem o schema (validado) | Script de provisionamento + seed mínimo (sem dados de exemplo) |
| Marca | Fixa no código | **Arquivo de marca** (nome, logo, cores, textos legais, domínio) lido em um só lugar |
| Segredos | Variáveis soltas | Modelo `.env.example` e checklist |
| Crons e webhooks | `vercel.json` fixo | Parametrizar por instalação |
| Primeiro acesso | Manual | Criação do 1º superadmin no instalador |
| Termos/LGPD | Texto da Vagas Consulting | Textos configuráveis ou modelo editável |
| Atualização | Manual | Estratégia de versão e migrations para N instalações |
| Licença | Inexistente | Definir licenciamento e o que o comprador pode alterar |

## 4. Riscos que valem decisão antes de vender

1. **LGPD:** quem é controlador e quem é operador em cada modelo; contrato e política de privacidade por cliente.
2. **Suporte:** cada instalação é uma superfície a manter; sem SLA definido vira custo escondido.
3. **Isolamento (B2):** um erro de filtro expõe candidatos de um cliente a outro.
4. **Marca e propriedade:** o que é seu (código) × do comprador (dados e marca); direito de atualização.
5. **Limites do Supabase Free:** hoje o projeto pausa por inatividade; nenhum cliente pagante aceita isso (precisa de plano Pro por instalação).
6. **Dependências externas:** Meta/WhatsApp e IA do currículo têm chaves e custos por cliente.

## 5. Roteiro sugerido

| Fase | Entrega | Esforço aproximado* | Depende de |
|---|---|---|---|
| **1** | **Carteira por atendente** (A): vínculo, filtro único, tela de atribuição | Pequeno a médio | Sua decisão sobre o desenho abaixo |
| **2** | **Perfis refinados**: o que cada um vê/faz; operador sem acesso a dados fora da carteira; auditoria da carteira | Pequeno | Fase 1 |
| **3** | **Marca configurável** (C, parte 1): arquivo único de marca; remover textos fixos | Pequeno | — |
| **4** | **Provisionamento** (B1/C): script que cria Supabase + migrations + 1º superadmin + variáveis | Médio | Fase 3 |
| **5** | **Instalador/entrega** (C): documentação, checklist e processo de atualização | Médio | Fase 4 |
| **6** | **Multi-tenant** (B2), se e só se houver demanda | Grande | Decisão de negócio |

*Ordem de grandeza, não orçamento: depende de quantas telas e regras entram.*

## 6. O que preciso que você decida

1. **Carteira:** uma empresa pertence a **um** atendente (dono) ou a **vários**? Operador pode **reatribuir**?
2. **Visão:** `admin` vê tudo (como o superadmin) ou também só uma carteira? O que **só** o superadmin faz (usuários, carteira, marca)?
3. **O operador cria** empresa e vaga, ou só trata as da carteira?
4. **Modelo comercial:** primeiro cliente de aluguel — será na **mesma** plataforma ou numa instalação própria?
5. **Marca do comprador:** o que ele pode trocar (nome, logo, cores, domínio, termos)?
6. **Prioridade:** começar pela Fase 1 (carteira) antes de pensar em venda?

## 7. Recomendação

Começar pela **Fase 1**: ela resolve uma necessidade real de operação (quem trata de qual
empresa), é pequena, não muda a arquitetura e é pré-requisito de qualquer venda. Em
paralelo, **não** investir em multi-tenant agora: a via de instalação por cliente reaproveita
quase todo o código e mantém os dados isolados por construção.
