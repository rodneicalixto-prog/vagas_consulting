import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dadosVazios,
  dadosDeFormulario,
  montarCarta,
  versaoCurta,
  placeholdersPendentes,
  verificarOferta,
  temBloqueioOferta,
  formatarSalario,
  regimeSugerido,
} from "../oferta.ts";

const completo = {
  ...dadosVazios(),
  empresa: "Acme",
  assinante_nome: "Rodnei",
  assinante_cargo: "Recrutador",
  contato: "rodnei@acme.com",
  candidato: "Marina",
  cargo: "Analista de Marketing",
  regime: "CLT",
  salario: "4500",
  forma_pagamento: "todo 5º dia útil",
  beneficios: ["VR R$ 800,00 por mês", "Plano de saúde"],
  modelo: "Híbrido",
  local: "Belo Horizonte/MG",
  jornada: "Seg a sex, 9h às 18h",
  data_inicio: "2026-11-03",
  experiencia: "45 dias",
  condicoes: "entrega de documentos e exame admissional",
  validade: "2026-10-30",
  proximos_passos: "Responda este e-mail com o aceite.",
  cidade_carta: "Belo Horizonte",
  tom: "descontraido",
};

test("salário vira valor bruto formatado; texto livre fica como digitado", () => {
  assert.equal(formatarSalario("4500"), "R$ 4.500,00");
  assert.equal(formatarSalario("4.500,50"), "R$ 4.500,50");
  assert.equal(formatarSalario("a combinar"), "a combinar");
  assert.equal(regimeSugerido("efetiva"), "CLT");
  assert.equal(regimeSugerido("temporaria"), "Temporário");
});

test("carta completa: bruto, benefícios, condições, validade e sem placeholder", () => {
  const t = montarCarta(completo, new Date("2026-10-15T12:00:00Z"));
  assert.ok(/R\$ 4\.500,00 bruto mensal, pago todo 5º dia útil/.test(t));
  assert.ok(/VR R\$ 800,00 por mês; Plano de saúde/.test(t));
  assert.ok(/condicionada a: entrega de documentos e exame admissional/.test(t));
  assert.ok(/válida até 30\/10\/2026/.test(t));
  assert.ok(/Data de início prevista: 03\/11\/2026/.test(t));
  assert.ok(/Oi, Marina!/.test(t));
  assert.deepEqual(placeholdersPendentes(t), []);
  assert.equal(temBloqueioOferta(verificarOferta(completo, t)), false);
});

test("nada é inventado: o que falta vira placeholder e bloqueia o envio", () => {
  const d = { ...completo, salario: "", experiencia: "", validade: "", condicoes: "", promocao: undefined };
  const t = montarCarta(d, new Date("2026-10-15T12:00:00Z"));
  const pend = placeholdersPendentes(t);
  assert.ok(pend.includes("{SALÁRIO BRUTO}") && pend.includes("{DATA DE VALIDADE}"));
  assert.ok(pend.some((p) => /PERÍODO DE EXPERIÊNCIA/.test(p)));
  assert.ok(!/promoção|plano de carreira|aumento/i.test(t));
  const vs = verificarOferta(d, t);
  assert.equal(temBloqueioOferta(vs), true);
  assert.ok(vs.some((v) => v.id === "validade" && v.nivel === "bloqueio"));
  assert.ok(vs.some((v) => v.id === "condicoes" && v.nivel === "bloqueio"));
});

test("variável fica separado do fixo e depende de regras; período só quando CLT ou informado", () => {
  const t = montarCarta({ ...completo, variavel: "Bônus de até 1 salário por metas trimestrais" }, new Date("2026-10-15"));
  assert.ok(/não integra o salário fixo/.test(t));
  const pj = montarCarta({ ...completo, regime: "PJ", experiencia: "" }, new Date("2026-10-15"));
  assert.ok(!/Período de experiência/.test(pj));
});

test("sempre há aviso de revisão do DP e nota de confidencialidade", () => {
  const t = montarCarta(completo, new Date("2026-10-15"));
  assert.ok(verificarOferta(completo, t).some((v) => v.id === "revisao"));
  assert.ok(/LGPD/.test(t));
});

test("versão curta cita cargo, empresa e validade; formulário limpa e limita", () => {
  const c = versaoCurta(completo);
  assert.ok(/Analista de Marketing/.test(c) && /Acme/.test(c) && /30\/10\/2026/.test(c));
  const d = dadosDeFormulario({ beneficios: "- VR\n\n* VA\nPlano", tom: "xpto", salario: " 5000 " });
  assert.deepEqual(d.beneficios, ["VR", "VA", "Plano"]);
  assert.equal(d.tom, "formal");
  assert.equal(d.salario, "5000");
});
