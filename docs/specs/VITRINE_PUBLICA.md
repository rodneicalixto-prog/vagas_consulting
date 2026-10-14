# Especificação — Vitrine pública de vagas e modo visitante (v0.1)

> **Projeto:** Vagas Consulting · **App:** v0.1.0 · **Documento:** Spec da vitrine pública v0.1 · **Data:** 14/10/2026
> **Status:** construída e publicada em 14/10/2026 por decisão do Rodnei.

## 1. Problema

O cadastro (termos, perfil, currículo e experiências) era um portão antes de
qualquer vaga. A pessoa precisava informar seus dados sem saber se existia a
vaga que procurava, e o botão Voltar do cadastro não levava a lugar útil.

## 2. Decisão (Rodnei, 14/10/2026)

1. A **lista de vagas e o detalhe da vaga passam a ser públicos**, sem login.
2. **Candidatar-se** exige conta; sem estar logada, a pessoa entra ou cria a
   conta e **volta para a mesma vaga**.
3. Quem está logado com cadastro incompleto pode ver a **home** e as vagas
   (**modo visitante**); o cadastro só é cobrado ao agir.

## 3. Regras

| Regra | Detalhe |
|---|---|
| O que é público | `/vagas` e `/vagas/<id>` (somente vaga **publicada** e **dentro do prazo**) |
| O que continua protegido | `/vagas/<id>/candidatura`, processos, convites, mensagens, perfil, tudo do painel |
| Sigilo | Vaga confidencial mostra "Empresa confidencial"; o nome real não sai do servidor |
| Leitura | No servidor, com colunas fixas e filtros de status e prazo; id fora do formato UUID dá 404 |
| Destino pós-login | Parâmetro `next` e cookie `destino_pos_cadastro` (24 h, httpOnly); só caminhos internos do candidato |
| Open redirect | `sanitizarDestino` recusa URL externa, `//`, barra invertida, quebra de linha, `/admin`, `/login`, `/api` e etapas do cadastro |
| Cadastro incompleto | Home e vagas abertas; qualquer outra rota leva à etapa que falta e, ao concluir, **volta ao destino guardado** |

## 4. Fluxo

```
Visitante → /vagas → /vagas/<id> → "Entrar para se candidatar"
   → /login?next=/vagas/<id>/candidatura → (cria conta → termos → perfil
   → experiências, destino guardado) → volta à candidatura da vaga
```

## 5. Verificação

- Teste de fumaça com o servidor de produção local: `/vagas` 200 como
  visitante; `/vagas/<uuid inexistente>` e `/vagas/abc` 404; candidatura,
  início e processos redirecionam a `/login?next=...`; `/admin` a
  `/admin/login`.
- 4 testes unitários de `sanitizarDestino` (open redirect).

## 6. Limites e riscos conhecidos

- Texto livre da descrição pode citar o nome da empresa de uma vaga
  confidencial; a revisão editorial é do admin que cadastra.
- Sem paginação (limite de 200 vagas); com a base crescendo, paginar.
- Sem busca no servidor (o campo de busca da lista ainda é visual).
- Vitrine pública torna as vagas indexáveis; os metadados (título, descrição
  curta, dados estruturados de vaga) ainda não foram trabalhados para SEO.
