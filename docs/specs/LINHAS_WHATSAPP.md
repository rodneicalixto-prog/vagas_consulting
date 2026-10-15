# Especificação — Números de WhatsApp (linhas) por empresa e por operador

> **Projeto:** Vagas Consulting · **Documento:** Spec das linhas v1.0 · **Data:** 15/10/2026
> **Status:** construída (15/10/2026); aguarda o primeiro teste com a Evolution real. Substitui a regra "um número por empresa" de
> `COMUNICACAO_OMNICANAL.md` (E2) por "uma ou mais linhas por empresa".
> Decisão do Rodnei (15/10/2026): **os dois modelos valem**. Exemplo: cliente
> com 6 números de RH, um por operador.

## 1. Modelo

Uma **linha** é uma instância da Evolution (um número de WhatsApp) que
pertence a uma empresa. Cada linha tem:

| Campo | Significado |
|---|---|
| Apelido | nome para a equipe ("RH Ana", "Recrutamento SP") |
| Operador (opcional) | **linha dedicada**: o número é de uma pessoa; sem operador = **linha compartilhada** da empresa |
| Agente de IA | `desligado`, `sugestao` (só rascunho para a pessoa) ou `automatico` (atende sozinho, se o agente da empresa permitir) |
| Padrão | a linha usada quando não há outra escolha (conversas antigas, envio sem linha) |
| Ativa | linha desativada não recebe nem envia |

Os dois modelos convivem na mesma empresa: uma linha compartilhada e linhas
dedicadas, ou só linhas dedicadas.

## 2. Regras de conversa

- A conversa pertence a **uma linha**: o mesmo telefone pode ter uma conversa
  em cada linha (único por empresa, telefone e linha).
- **Linha dedicada:** a conversa nasce já atribuída ao operador da linha e
  **não vai para a fila**; só o operador da linha, o admin da empresa e a
  plataforma a veem. Para outra pessoa assumir, o admin transfere.
- **Linha compartilhada:** continua o modelo atual (fila, assumir, devolver,
  transferir; o operador vê as próprias e a fila de candidatos).
- **Envio** sai sempre pela linha da conversa. Conversa sem linha usa a padrão.
- **Descadastro e black list** valem por empresa, em qualquer linha.

## 3. Agente de IA por linha

- `desligado`: o agente não gera nada nessa linha.
- `sugestao`: gera rascunho para a pessoa revisar; nunca envia sozinho,
  mesmo que o agente da empresa esteja em atendimento automático.
- `automatico`: só vale se o agente da empresa tiver autonomia para isso.
- Padrão ao criar: linha dedicada começa em `sugestao`; linha compartilhada
  herda o que já existe hoje (`automatico`, limitado pelo agente da empresa).
- A retomada após 30 minutos sem ação humana **nunca devolve à fila** conversa
  de linha dedicada.

## 4. Conectar o número

Tela **Números de WhatsApp** (`/admin/linhas`):

1. **Nova linha:** apelido, operador (opcional), modo do agente. A plataforma
   cria a instância na Evolution (nome gerado: empresa + apelido + sufixo
   aleatório), configura o **webhook** sozinha e mostra o **QR code**.
2. **QR code:** atualiza o estado até conectar (aberta). Mostra o número lido
   da própria instância.
3. **Estado:** conectada, conectando ou desconectada, com **Reconectar** (novo QR)
   e **Desconectar** (logout). Nada é apagado na Evolution pelo app.
4. **Desativar** a linha (não exclui conversas).

## 5. Limites e permissões

| Quem | Pode |
|---|---|
| Superadmin | criar e gerenciar linhas de qualquer empresa; ajustar o limite |
| Admin da empresa | criar e gerenciar linhas da própria empresa, até o limite |
| Operador | ver apenas o estado da própria linha |

- `companies.max_linhas_whatsapp` (padrão 1): limite comercial por empresa,
  editado pelo superadmin (modelo de aluguel).
- Nome da instância é único na plataforma; QR code e token **nunca** são
  gravados nem aparecem em log.

## 6. Migração

- Cada instância já cadastrada em Integrações (escopo empresa) vira a linha
  **padrão** da empresa; as conversas existentes ficam nela. Nada muda para
  quem já usa um número só.
- O cadastro antigo em Integrações continua lido como reserva enquanto não
  houver linha.

## 7. Aceite

1. Empresa com 2 linhas dedicadas: mensagem na linha A cria conversa só do
   operador A; operador B não a vê.
2. A mesma pessoa escrevendo nas duas linhas gera duas conversas.
3. Resposta do operador sai pelo número da linha da conversa.
4. Linha em `sugestao`: o agente nunca envia sozinho.
5. Criar linha mostra o QR; ao escanear, o estado vira conectada e o número aparece.
6. Admin da empresa não passa do limite de linhas; superadmin consegue ajustar.
7. Empresa com um número só segue funcionando sem nenhuma ação.

## 8. Fora desta entrega

- Meta Cloud API (oficial) como alternativa à Evolution.
- Distribuição automática entre linhas (rodízio).
- Envio de uma mesma campanha por várias linhas.

## 9. Como ficou (15/10/2026)

- **Banco:** migrations `0044` (linhas, limite por empresa, `conversations.line_id`)
  e `0045` (unicidade por empresa, telefone e linha, com `NULLS NOT DISTINCT`).
  O número que já existia (`sos_vagas`) virou a linha **padrão**, com as 4
  conversas dentro dela.
- **Tela:** `/admin/linhas` (menu Plataforma > Números de WhatsApp), para o
  superadmin e o admin da empresa: criar, QR code com atualização, estado e
  número lido da instância, desconectar, religar o recebimento, editar
  (apelido, operador, modo do agente, ativa) e, só para a plataforma, o limite.
- **Recebimento:** o webhook resolve a linha pela instância; conversa nova em
  linha dedicada já nasce do operador dono do número.
- **Envio:** inbox e agente enviam pela linha da conversa.
- **Agente:** `desligado` não gera; `sugestao` nunca envia sozinho; linha
  dedicada nunca é retomada nem devolvida à fila.
- **Fila:** "devolver à fila" é recusado em conversa de número dedicado.

**Limites:** a criação da instância, o QR e o webhook usam a API da Evolution
v2 e **ainda não foram exercitados contra o servidor real**: o primeiro número
novo é o teste. Reatribuir uma linha a outro operador não move conversas já com dono.

### 9.1 Número de origem na lista de conversas (15/10/2026)

- Cada conversa mostra um chip com o **apelido do número** quando a empresa
  tem mais de um; a conversa aberta mostra "Número: apelido" no cabeçalho
  (a resposta sai por ele).
- Filtro **Número** na lista (Todos ou um número), combinável com busca e com
  "Não lidas". O operador continua vendo só as próprias conversas e a fila de
  candidatos, em qualquer filtro.
