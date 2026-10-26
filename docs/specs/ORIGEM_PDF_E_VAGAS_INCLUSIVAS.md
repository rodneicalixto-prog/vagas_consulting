# Origem do candidato, exportar PDF e vagas inclusivas (v0.1)

> **Projeto:** Vagas Consulting · **Data:** 26/10/2026 · **Uso:** próprio. Construído localmente; **nada publicado**.
> Pedidos do Rodnei: (1) descrever vagas para PcD, estagiários e melhor idade; (2) salvar a origem dos
> candidatos, por qual canal chegaram; (3) possibilidade de exportar PDF.

## 1. Origem do candidato

**Dois registros, de propósito:**

| Onde | O que guarda | Quando grava |
|---|---|---|
| `profiles.origem_canal`, `origem_detalhe`, `origem_em` (migration `0052`) | **Primeiro toque**: como a pessoa chegou ao app | No cadastro (onboarding), só se o perfil ainda não tem origem. Nunca sobrescreve |
| `applications.origem` (já existia) | Por qual canal chegou **a esta vaga** | Ao se candidatar |

**Canais:** direto no app, divulgação da vaga (detalhe = LinkedIn, Instagram, WhatsApp...), hunter (detalhe = plataforma),
campanha (`?utm_source=`), convite da equipe, WhatsApp, anúncio (Meta), indicação, outro, não informado.

**Como é captado:** o middleware guarda um cookie de 90 dias (`origem_ct`) quando o link traz `?o=<canal da divulgação>` ou
`?utm_source=<texto>` e ainda não existe um. O link do hunter (`/h/<token>`) guarda `hunter_token`. No cadastro vale
**hunter > cookie > direto**. Na candidatura vale **marcador no link > hunter > primeiro toque (cookie) > direto**. O cookie é validado
(formato e lista de canais): valor adulterado é ignorado.

**Onde aparece:** ficha do candidato ("Chegou ao app por" e coluna "Chegou por" em cada candidatura) e o relatório
`/admin/origens` (cadastros, candidaturas, contratados e conversão por canal, por período, respeitando carteira e sigilo).

**Limites assumidos:** perfis anteriores à `0052` aparecem como "não informado" (nada é inventado). Leads do Meta e conversas de WhatsApp
têm origem própria nas suas tabelas e **ainda não** são ligados ao perfil quando a pessoa se cadastra.

## 2. Exportar PDF

Sem biblioteca nova: botão **Exportar PDF** abre a impressão do navegador, onde "Salvar como PDF" gera o arquivo. O CSS de impressão
(`globals.css`) tira o menu, a barra e a ajuda e faz o conteúdo correr em uma coluna, em vez de sair cortado pelos painéis com rolagem.

**Com botão:** Central da vaga, Triagem (ranking), Indicadores de R&S, Origem dos candidatos e a nova **Ficha da vaga**.
Laudo, entrevista e carta-oferta já tinham impressão; agora saem sem cortes. **Hunter fica sem PDF de propósito:** a lista tem telefone e
e-mail de quem não é candidato, e uma cópia em arquivo fugiria do controle de retenção.

**Ficha da vaga** (`/admin/vagas/[id]/ficha`): descrição pronta para compartilhar. Escolhe-se mostrar ou não a faixa e o nome da empresa;
**vaga sigilosa nunca mostra a empresa**. Traz a frase fixa do perfil (abaixo) e o link para se candidatar. Mostra, só na tela, os avisos e
bloqueios da vaga.

## 3. Vagas inclusivas: PcD, estágio e melhor idade (60+)

Novo campo **Tipo de vaga** nos Critérios (`criterios.perfil`, sem migration: é JSON) e três modos novos em "Gerar critérios com IA".
O perfil muda: o prompt de critérios, o prompt de divulgação, as verificações (OK / Aviso / Bloqueia) e a frase fixa da ficha.

| Perfil | O que a IA faz | **Bloqueia** | Avisa |
|---|---|---|---|
| **PcD** (afirmativa) | Descreve a função por atividades e competências, não por limitações; pergunta pela acessibilidade que a empresa oferece | Pedir laudo ou CID no anúncio (só na admissão) | "Portador/deficiente" em vez de "pessoa com deficiência"; exigir "boa saúde"; faltar informação de acessibilidade |
| **Estágio** | Senioridade estágio, sem experiência prévia; rotina de aprendizado com supervisor; curso, bolsa e carga horária só se vierem no texto | Carga acima de 6 horas diárias | Exigir experiência; faltar curso ou bolsa; senioridade diferente de estágio |
| **60+** | Valoriza experiência, repertório e mentoria; sem limite de idade e sem estereótipo | Idade como critério eliminatório (e a regra geral de idade máxima) | "Jovem", "energia", "dinâmico"; "somente acima de X anos" (peça revisão jurídica) |

Base legal resumida: Lei 8.213/91 art. 93 e Lei 13.146/2015 (PcD), Lei 11.788/2008 (estágio) e Lei 10.741/2003 art. 27 (sem limite máximo de
idade). **[A VALIDAR]** revisão jurídica das frases fixas e da vaga "60+" antes de divulgar em escala: ação afirmativa por idade é prática
comum, mas o texto precisa de cuidado.

## 4. Decisões assumidas [A VALIDAR]

- "Melhor idade" = foco em profissionais **60 anos ou mais** (decisão do Rodnei em 26/10/2026; alinha com a pessoa idosa do Estatuto, Lei 10.741/2003, cujo art. 27 veda limite máximo de idade na admissão).
- PDF por impressão do navegador, não por geração no servidor (zero dependência). Se quiser PDF gerado no servidor, é uma fase própria.
- Hunter sem PDF.

---

## Fechamento

1. **O que foi feito ou decidido:** origem em dois níveis (perfil e candidatura) com captação por link; PDF por impressão com CSS próprio; três perfis inclusivos com IA, verificações e ficha.
2. **O que está pendente:** aplicar a migration `0052`; revisão jurídica das frases; ligar leads do Meta e WhatsApp ao perfil.
3. **Próximo passo claro:** aplicar a `0052` com o seu OK e testar um link `?o=whatsapp` até o cadastro.
