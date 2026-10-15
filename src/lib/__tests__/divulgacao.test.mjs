import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canalValido,
  montarPromptDivulgacao,
  divulgacaoDaResposta,
  verificarDivulgacao,
  temBloqueioDivulgacao,
} from "../divulgacao.ts";

const base = {
  canais: ["linkedin", "portal"],
  perfilTecnico: true,
  tom: "descontraido",
  mostrarFaixa: true,
  link: "https://x.com/vagas/1",
  confidencial: false,
  empresa: "SOS Vagas",
  vaga: { titulo: "Dev Backend Pleno", local: "Remoto", modelo_trabalho: "remoto", modalidade: "pj", remuneracao_texto: "R$ 12.000,00", descricao: null },
  criterios: { rotina: "Constrói APIs.", obrigatorios: ["Node", "SQL"], desejaveis: [], diferencial: "Remoto" },
};
const ctx = { perfilTecnico: true, temFaixa: true, mostrarFaixa: true, vagaPublicada: true, link: "https://x.com/vagas/1?o=linkedin" };

test("prompt pede só os canais escolhidos e protege vaga confidencial", () => {
  const { system, user } = montarPromptDivulgacao(base);
  assert.ok(system.includes("- linkedin:") && system.includes("- portal:") && !system.includes("- whatsapp:"));
  assert.ok(system.includes("R$ 12.000,00") === false && user.includes("R$ 12.000,00"));
  const sigilo = montarPromptDivulgacao({ ...base, confidencial: true });
  assert.ok(sigilo.system.includes("CONFIDENCIAL") && !sigilo.system.includes("Empresa: SOS Vagas"));
  const semFaixa = montarPromptDivulgacao({ ...base, mostrarFaixa: false });
  assert.ok(!semFaixa.user.includes("R$ 12.000,00"));
  assert.equal(canalValido("linkedin"), true);
  assert.equal(canalValido("tiktok"), false);
});

test("leitura da resposta ignora canal não pedido e texto vazio", () => {
  const r = divulgacaoDaResposta(
    JSON.stringify({
      canais: [
        { canal: "linkedin", texto: "Oi, time!", ganchos: ["a", "b"], hashtags: ["#vaga"] },
        { canal: "whatsapp", texto: "não pedido" },
        { canal: "portal", texto: "" },
      ],
      suposicoes: ["tom descontraído"],
    }),
    ["linkedin", "portal"],
  );
  assert.equal(r.textos.length, 1);
  assert.equal(r.textos[0].canal, "linkedin");
  assert.deepEqual(r.suposicoes, ["tom descontraído"]);
  assert.equal(divulgacaoDaResposta("nada", ["linkedin"]), null);
});

test("verificação: discriminação bloqueia; portal sem markdown; linkedin com link avisa", () => {
  const ruim = verificarDivulgacao(
    { canal: "portal", titulo: "Vendedor", ganchos: [], texto: "**Vaga** para homens até 30 anos. Candidate-se.", briefing_arte: "", hashtags: [] },
    ctx,
  );
  assert.equal(temBloqueioDivulgacao(ruim), true);
  assert.equal(ruim.find((v) => v.id === "formato").nivel, "aviso");

  const li = verificarDivulgacao(
    {
      canal: "linkedin",
      titulo: "",
      ganchos: ["Quer construir APIs sem pressa?"],
      texto: "Meu time cresce.\nCandidate-se: https://x.com/vagas/1?o=linkedin\n#vaga #backend #node",
      briefing_arte: "",
      hashtags: ["#vaga", "#backend", "#node"],
    },
    ctx,
  );
  assert.equal(temBloqueioDivulgacao(li), false);
  assert.equal(li.find((v) => v.id === "link_linkedin").nivel, "aviso");
  assert.equal(li.find((v) => v.id === "hashtags").nivel, "ok");
  assert.equal(li.find((v) => v.id === "cta").nivel, "ok");
});
