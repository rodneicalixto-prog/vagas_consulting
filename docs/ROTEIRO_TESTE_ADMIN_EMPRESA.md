# Roteiro de teste — Admin da empresa e isolamento (20 minutos)

> **Projeto:** Vagas Consulting · **Versão do app:** commit `main` de 14/10/2026 · **Documento:** Roteiro de teste v1.0
> **Objetivo:** provar com uso real que cada empresa enxerga só o que é dela e que o admin da empresa tem exatamente os poderes decididos.
> **Quem executa:** Rodnei (superadmin). **Tempo:** ~20 min. **Riscos:** só dados de teste; nada é apagado.

## Preparação (3 min)

Use um e-mail com `+alias` do seu Gmail: todos chegam na mesma caixa.

| Papel de teste | E-mail sugerido |
|---|---|
| Admin da empresa A | `rodneicalixto+adminA@gmail.com` |
| Operador da empresa A | `rodneicalixto+opA@gmail.com` |
| Candidato | `rodneicalixto+cand1@gmail.com` |
| Candidato 2 (problemático) | `rodneicalixto+cand2@gmail.com` |

Abra uma **janela anônima** por perfil (para não misturar sessões).

## Parte 1 — Superadmin prepara o cenário (5 min)

Entre como **superadmin**.

1. **Empresas → + Cadastrar empresa**: crie **"Teste A"** e **"Teste B"**; ative as duas.
   - ✅ Aparecem na lista com situação "Ativa".
2. **Carteira → Vagas de operador por empresa**: veja **Teste A: 0 de 4 em uso · 4 em aberto**.
   - Altere o limite de Teste A para **1**.
   - ✅ O contador passa a **0 de 1 · 1 em aberto**.
3. **Acesso → Convidar usuário**: perfil **Admin da empresa**, empresa **Teste A**, e-mail `+adminA`.
   - ✅ Mensagem de convite enviado. Abra o e-mail e defina a senha.
4. **Cadastro de vagas → + Nova vaga**: crie **"Vaga A1"** em Teste A e **"Vaga B1"** em Teste B; **publique as duas**.
   - ✅ Ficam em "Abertas" dentro da respectiva empresa.
5. Marque **"Vaga A2 sigilosa"** (Teste A) como **sigilosa** e publique.

## Parte 2 — Entrar como Admin da empresa A (8 min)

Janela anônima → `/admin/login` com `+adminA`.

| # | Teste | Resultado esperado |
|---|---|---|
| 1 | Olhe o menu | Mostra Visão geral, Empresas, Cadastro de vagas, Candidatos, Contatos, Talentos, Convites, Agenda, Prestações, Black list, Operadores. **Não** mostra Ranking, Leads, Denúncias, LGPD, Auditoria, Carteira, Acesso, Estratégico |
| 2 | Rodapé do menu | Mostra **"Administrador da empresa"** |
| 3 | **Empresas** | Só **Teste A**; sem "+ Cadastrar empresa" |
| 4 | **Cadastro de vagas** | Só Teste A: **Vaga A1** e **Vaga A2 (Sigilosa)**. **Não** aparece "Vaga B1" |
| 5 | Abra a Vaga A1 | **Não** há botão Publicar, Pausar nem Cancelar; há "Marcar como sigilosa" |
| 6 | **+ Nova vaga** | Só a empresa Teste A na lista; cria como rascunho |
| 7 | **Operadores** | Mostra **0 de 1 · 1 em aberto**. Convide `+opA` ✅ |
| 8 | Convide **outro** operador (e-mail `+opA2`) | **Recusa**: limite atingido ✅ (trava funcionando) |
| 9 | Desative `+opA` e convide `+opA2` de novo | Passa a funcionar ✅ (vaga liberada) |
| 10 | Tente abrir `/admin/ranking` e `/admin/carteira` direto na barra | Vai para "acesso negado" ✅ |
| 11 | **Prestações** | Abre em leitura; sem formulário de registrar/alterar pagamento |

## Parte 3 — Candidatos e black list da empresa (4 min)

Janela anônima nova, como **candidato** (`+cand1`):

1. Abra `/vagas` **sem login**. ✅ Vê as vagas publicadas; **A2 aparece como "Empresa confidencial"**.
2. Toque em "Entrar para se candidatar" → crie conta → complete o cadastro → **volta à mesma vaga** → candidate-se a **Vaga A1**.
   - ✅ Candidatura enviada.
3. Repita com `+cand2` (candidate-se a Vaga A1 também).

De volta ao **Admin da empresa A**:

4. **Candidatos**: vê **Teste A → Vaga A1** com os dois candidatos. ✅ Nada de Teste B.
5. **Black list → + Cadastrar candidato problemático**: escolha `+cand2`, motivo "teste de bloqueio".
   - ✅ Aparece na lista da empresa.
6. Como `+cand2`, tente se candidatar a **outra vaga de Teste A** (crie "Vaga A3" publicada pelo superadmin antes).
   - ✅ Recusa com mensagem neutra: "Não foi possível enviar sua candidatura para esta vaga."
7. Como `+cand2`, candidate-se a **Vaga B1** (Teste B).
   - ✅ **Funciona**: o bloqueio vale só para a Teste A.
8. Admin da empresa A → Black list → **Liberar** `+cand2`; repita o passo 6.
   - ✅ Agora a candidatura é aceita.

## Fechamento (conferência final)

Como **superadmin**, abra **Auditoria**:

| Esperado nos registros |
|---|
| `limite_operadores_alterado`, `admin_empresa_convidado`, `operador_convidado`, `operador_desativado` |
| `blacklist_empresa_adicionado` e `blacklist_empresa_removido` |

## O que me enviar

Para cada linha, responda **OK** ou descreva o que viu. Em caso de falha, mande um print e a URL. Itens críticos (se algum falhar, é **bloqueio de publicação para clientes reais**): **Parte 2 itens 4, 8, 10** e **Parte 3 itens 4, 6, 7**.

## Depois do teste (limpeza opcional)

Peça-me para **desativar** as empresas "Teste A" e "Teste B" e os usuários de teste. Nada é apagado; o histórico fica na auditoria.
