# 3.1 Critérios da vaga

> **Estado:** rascunho, escrito a partir do código e da spec em 15/10/2026.
> Passos marcados `[A VALIDAR]` ainda não foram executados no roteiro de teste (passo 2).

## Para que serve

Transformar o pedido do gestor em **campos claros**. É a base de tudo que vem
depois: divulgação, triagem, roteiro, testes e laudo leem esses critérios.
Critério bem escrito evita retrabalho e discriminação sem querer.

## Quem faz

Operador, administrador da empresa, administrador e superadmin.

## Onde fica

`Empresas e vagas → Cadastro de vagas → abrir a vaga` (a tela se chama **Critérios da vaga**).

## Antes de começar

- Tenha em mãos o recado do gestor (texto ou áudio) ou a descrição da vaga.
- Se for usar áudio, ele deve ter **até 4 MB** (ogg, mp3, m4a, wav ou webm).

## Passo a passo

1. Abra a vaga e expanda **Gerar critérios com IA**.
2. Se tiver áudio, escolha o arquivo e clique em **Transcrever áudio**. O texto
   entra no campo; **leia e corrija** o que vier errado.
3. Escolha o que fazer: criar a partir do recado, reescrever uma descrição,
   vaga júnior ou vaga de liderança (informe o tamanho do time).
4. Clique em **Gerar proposta**.
5. Confira os campos preenchidos e a lista de **lacunas** (o que perguntar ao
   gestor). Ajuste à mão o que precisar.
6. Para marcar um obrigatório como **eliminatório**, comece a linha com `*`.
7. Clique em **Salvar critérios**. Só então a proposta passa a valer.

## O que você vai ver

| Elemento | Significado |
|---|---|
| **Proposta da IA** | Os campos foram preenchidos, mas ainda não valem até você salvar |
| **Lacunas** | O que o texto não trouxe; pergunte ao gestor em vez de supor |
| **Verificação de qualidade** | Lista com *OK*, *Aviso* ou *Bloqueia* |
| Aviso de 4 a 7 obrigatórios | Muitos ou poucos obrigatórios deixam a vaga fraca |
| Aviso de clichê, de gênero ou título criativo | Troque por algo concreto e neutro |
| **Bloqueia** | Termo que discrimina (idade, sexo, estado civil, "boa aparência"): a vaga não publica |

## O que a plataforma não faz

- **Não publica a vaga sozinha** e não confirma a proposta por você.
- **Não inventa requisito** que o recado não trouxe: ele vira lacuna.
- **Não guarda o áudio:** só o texto transcrito aparece na tela, e depois vale o
  que você salvar.
- Transcrição e geração por IA **contam no teto mensal** de IA.

## Erros comuns e o que fazer

| Situação | O que fazer |
|---|---|
| "Há termo que discrimina" | Reescreva o critério; a publicação fica bloqueada até lá |
| "O áudio passa de 4 MB" | Corte ou comprima o áudio |
| "Não há chave da OpenAI cadastrada" | Peça ao administrador da empresa ou à plataforma |
| "O teto mensal foi atingido" | Peça à plataforma para ampliar |
| A proposta saiu fraca | Complete o recado com o que o gestor disse e gere de novo |

## Veja também

- [3.2 Divulgação](02-divulgacao.md)
- [3.3 Triagem](03-triagem.md)
- [Regras de ouro](../apendices/regras-de-ouro.md)
