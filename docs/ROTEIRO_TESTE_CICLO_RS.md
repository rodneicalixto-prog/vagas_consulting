# Roteiro de teste: ciclo completo de R&S

Tempo estimado: 80 a 110 minutos. Use **candidatos e vaga de teste**, não
pessoas reais. Em cada passo há o que fazer, o que deve acontecer e o que
**não** deve acontecer. Se algo diferente ocorrer, anote o número do passo.

Endereço base: `https://sosvagas.sosmkt.com.br`

---

## 0. Antes de começar

| # | Confira | Onde |
|---|---|---|
| 0.1 | Chave **OpenAI** cadastrada | Integrações |
| 0.2 | Agente **ligado** | `/admin/agente` |
| 0.3 | Nota "Como funciona o processo seletivo" **aprovada** | `/admin/agente` |
| 0.4 | Uma **vaga de teste** com 2 ou 3 candidaturas de contas de teste, com experiências preenchidas no cadastro | `/admin/vagas` |
| 0.5 | Você está logado como **superadmin** | menu lateral |

---

## 1. Base de conhecimento

Página: `/admin/agente`

1. Olhe o painel **Confiabilidade da base**. Com notas aprovadas e sem prazo, o nível deve ser Confiável ou Atenção.
2. Em uma nota aprovada, coloque **Vale até** com uma data **no passado** e salve. Tente aprovar de novo: **deve recusar** pedindo para renovar a data.
3. Crie duas notas do mesmo tipo com títulos parecidos e valores diferentes (ex.: "Prazo de retorno ao candidato: 5 dias" e "Prazo de retorno do candidato: 10 dias"), aprove as duas: o painel deve apontar **possível conflito**.
4. Arquive a nota de teste e volte as datas ao normal.

**Não deve:** uma nota vencida continuar aparecendo como em vigor.

---

## 2. Critérios da vaga (com o áudio do gestor)

Página: `/admin/vagas/[id]`

1. Abra **Gerar critérios com IA**.
2. Envie um **áudio curto** (até 4 MB) falando a vaga e clique em **Transcrever áudio**. O texto deve entrar no campo; corrija o que vier errado.
3. Escolha "Criar a partir do recado do gestor" e **Gerar proposta**.
4. Confira os campos preenchidos e as **lacunas** ("o que perguntar ao gestor"). Clique em **Salvar critérios**.
5. Digite um critério com "apenas homens" e salve: a **verificação deve bloquear** a publicação.

**Não deve:** a IA inventar requisito que o áudio não trouxe.

---

## 3. Divulgação e origem do candidato

Página: `/admin/vagas/[id]/divulgacao`

1. Marque LinkedIn e Portal, perfil "menos técnico", e gere.
2. Confira: 2 ganchos no LinkedIn, título limpo no portal, sem markdown no portal.
3. Copie o link do LinkedIn (termina em `?o=linkedin`). Abra em **janela anônima**, entre com uma conta de teste e candidate-se.
4. Guarde esta conta: ela vai aparecer em **Indicadores > Fontes** como "linkedin".

---

## 4. Triagem

Página: `/admin/vagas/[id]/triagem`

1. Clique em **Triar candidatos**.
2. Abra um candidato: cada critério deve mostrar **Atende / Não atende / Não evidenciado** e, quando atende, a **frase do cadastro**.
3. Confira "A validar na entrevista" (lacunas e trocas de emprego aparecem ali, sem baixar a nota).
4. Use **Top 3** e **Baixar planilha (CSV)**; abra o CSV no Excel.
5. Mude um critério na vaga e volte: deve aparecer "Critérios mudaram: refazer".

**Não deve:** aparecer nome, idade ou contato no que vai à IA (a tela mostra o nome, a IA não recebe).

---

## 5. Roteiro de entrevista e ficha

Página: `/admin/vagas/[id]/entrevista`

1. Gere um roteiro de 45 minutos com 4 competências e 1 valor.
2. Confira os **avisos** (tempo, mistura STAR e situacional) e que não há pergunta sobre família, idade, religião ou saúde.
3. Clique em **Baixar em Word** e abra.
4. Abra a ficha de um candidato, use **Gerar perguntas dos pontos a validar**.
5. Tente **fechar a ficha** com uma nota 1 **sem evidência**: deve recusar. Complete e feche.
6. Tente editar a ficha fechada: deve recusar.

---

## 6. Testes e dinâmicas

Página: `/admin/vagas/[id]/testes`

1. Gere uma **prova técnica** com uma competência-alvo.
2. Tente gerar com tipo "personalidade" ou competência "teste DISC": **deve recusar**.
3. Abra a folha do candidato (**Word: candidato**): **não pode haver gabarito** nem critério.
4. **Aprove** o instrumento e registre a nota 1 a 4 de um candidato (nota 4 exige evidência).
5. Gere uma **dinâmica** e confira que a grade tem os 4 níveis.

---

## 7. Laudo

Página: `/admin/vagas/[id]/laudos`

1. Para o candidato que passou por triagem, ficha e teste, gere um laudo **"Só fatos"**. Confira o quadro: fonte e força da evidência por linha, "não avaliado" onde faltou.
2. Gere outro com **"Com recomendação"**. Tente assinar citando uma linha **não avaliada**: deve recusar.
3. Escolha "Contratar com ressalva" sem condições: deve recusar.
4. Complete e **assine**. Tente alterar: deve recusar (só nova versão).
5. Use **Resumo para o gestor** e **Baixar em Word**.
6. Marque dois candidatos e **Comparar**.

---

## 8. Devolutiva

Página: `/admin/vagas/[id]/devolutivas`

1. **Aprovação** sem próximo passo ou prazo: deve recusar.
2. **Genérica** para quem parou na triagem: confira nome e vaga no texto.
3. Marque "banco de talentos" **desmarcado** e edite o texto incluindo "vamos guardar seu currículo": ao marcar como enviada, **deve bloquear**.
4. Marque a devolutiva como **enviada**. Tente gerar e enviar uma segunda para o mesmo candidato: **deve recusar**.
5. Teste o **lote** genérico com 2 candidatos.

---

## 9. Carta-oferta

Página: `/admin/vagas/[id]/ofertas`

1. Monte uma carta **sem salário e sem validade**. Os campos devem aparecer como `{SALÁRIO BRUTO}` e `{DATA DE VALIDADE}`, e **marcar enviada deve bloquear**.
2. Edite os campos, preencha tudo. O salário deve sair como **R$ ... bruto mensal**.
3. Confira que **nada foi inventado** (carreira, aumento, promoção).
4. **Baixar em Word** e abra.
5. Marque **Já enviei**: a candidatura deve ir para **Proposta** e a carta não deve mais mudar.
6. Marque **Candidato aceitou**.

---

## 10. Abordagem ativa

Página: `/admin/vagas/[id]/abordagem`

1. Cole um perfil de teste que inclua uma linha com **telefone, e-mail e "casada, dois filhos"**.
2. Gere em **nota de conexão do LinkedIn**: deve ter até 300 caracteres. O aviso de dados pessoais descartados deve aparecer.
3. Confira os **2 follow-ups** e o ângulo com o trecho do perfil.
4. Marque **Já enviei**. Em **Precisa de ação agora**, o card de follow-up aparece quando vencer (para testar já, peça-me para antecipar a data).
5. Marque **Pediu para não contatar**: o texto deve sumir e uma nova abordagem do mesmo nome deve ser recusada.

---

## 11. Indicadores

Página: `/admin/indicadores`

1. Mês atual: confira o **funil** e a **fonte "linkedin"** do passo 3.
2. Os indicadores manuais devem estar como **"sem dado"** (não zero).
3. Preencha **Números do mês** (custo, NPS, turnover) e salve; confira status e leitura em conjunto.
4. A **aceitação de oferta** deve vir da carta do passo 9 (1 de 1).
5. Crie uma ação no plano (até 3). Tente criar a quarta: deve recusar.

---

## 12. Agente no WhatsApp

1. Do celular de teste, pergunte algo que **existe** nas notas aprovadas. A resposta deve citar só o que está nas notas.
2. Pergunte algo que **não existe**. Deve encaminhar para a equipe, **sem inventar**.
3. Volte em `/admin/agente`: o painel deve mostrar o tema em "Perguntas sem resposta" depois de repetido 2 vezes, e a qualidade por nota depois de 5 respostas.

---

## 13. Números de WhatsApp (empresa e operador)

Página: `/admin/linhas` (Plataforma > Números de WhatsApp)

1. Em uma empresa de teste, clique em **Criar número** com um apelido e **sem** operador (compartilhado).
2. Use **Mostrar QR code** e leia com um celular de teste. O estado deve virar **Conectada** e o número deve aparecer.
3. Mande uma mensagem de outro celular para esse número: a conversa deve aparecer na fila, com o chip do número.
4. Crie um **segundo número dedicado a um operador**. Mande uma mensagem para ele: a conversa deve cair **direto com o operador**, sem passar pela fila, e o outro operador **não** pode vê-la.
5. Responda pelo inbox: a resposta deve sair **pelo número da conversa** (confira no celular que recebeu).
6. A mesma pessoa escrevendo nos dois números deve gerar **duas conversas**.
7. Com o agente em "só sugestão" no número dedicado, confirme que **nada é enviado sozinho**.
8. Como admin da empresa, tente criar além do limite: deve **recusar**; como superadmin, aumente o limite e crie.
9. Edite o número dedicado trocando o operador **com** a opção de passar as conversas: elas devem ir para o novo operador.
10. **Desconecte** o número e confira que o estado vira Desconectada e que o envio é recusado.

---

## O que me enviar se algo falhar

1. **Número do passo** (ex.: 7.3).
2. **O que esperava** e **o que aconteceu**.
3. **Print da tela** ou o texto do erro.
4. **Horário aproximado**, para eu cruzar com o log.

## Limites conhecidos (não são falhas)

- A leitura de **PDF** do currículo só entra quando o cadastro está vazio.
- **Word** sem tabelas nem papel timbrado.
- A recuperação de notas é **por palavras**: sinônimos podem cair no fallback (todas as notas).
- O funil do mês é **aproximado** (só existe o status atual).
- A plataforma **não envia** devolutiva, carta nem abordagem: você envia e marca.
