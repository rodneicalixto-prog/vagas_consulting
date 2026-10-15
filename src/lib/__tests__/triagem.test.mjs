import { test } from "node:test";
import assert from "node:assert/strict";
import {
  montarCurriculoCego,
  sinaisDeHistorico,
  mesAbsoluto,
  hashCriterios,
  bloqueiosDaTriagem,
  resultadoDaResposta,
  resultadoSemDados,
  ordenarRanking,
  sugerirCorte,
} from "../triagem.ts";

const criterios = {
  rotina: "",
  obrigatorios: ["Experiência com Node.js", "Inglês técnico"],
  eliminatorios: ["Inglês técnico"],
  desejaveis: ["Experiência com AWS"],
  comportamentais: ["Trabalho em equipe"],
  senioridade: "pleno",
  anos_experiencia: 5,
  diferencial: "",
  lacunas: [],
  proposta_ia: false,
  confirmado_em: null,
};

const perfil = {
  titulo_profissional: "Desenvolvedor Backend",
  resumo: "Tenho 34 anos de idade, casado. Trabalho com Node.js e AWS. Contato: ana@x.com 11 98888-7777",
  experiencias_profissionais: [
    { empresa: "Acme", cargo: "Dev Node.js", inicio: "01/2020", fim: "12/2022", motivoSaida: "salário baixo" },
  ],
};

test("currículo às cegas remove idade, estado civil, contato e motivo de saída", () => {
  const { texto, vazio } = montarCurriculoCego(perfil);
  assert.equal(vazio, false);
  assert.ok(!/34 anos de idade|casad|ana@x|98888/i.test(texto));
  assert.ok(!/salário baixo/.test(texto));
  assert.ok(texto.includes("Node.js"));
});

test("perfil sem dados é marcado como vazio", () => {
  assert.equal(montarCurriculoCego({}).vazio, true);
});

test("datas e sinais de histórico são calculados no código", () => {
  assert.equal(mesAbsoluto("03/2020"), 2020 * 12 + 2);
  const s = sinaisDeHistorico(
    [
      { inicio: "01/2015", fim: "12/2016" },
      { inicio: "01/2019", fim: "06/2019" },
      { inicio: "07/2019", fim: "12/2019" },
      { inicio: "01/2020", fim: "05/2020" },
    ],
    new Date(2024, 0, 1),
  );
  assert.ok(s.anos > 3 && s.anos < 5);
  assert.ok(s.avisos.some((a) => /Intervalo/.test(a)));
  assert.ok(s.avisos.some((a) => /menos de 12 meses/.test(a)));
});

test("critérios: bloqueia sem obrigatórios, proposta não conferida e discriminação", () => {
  assert.equal(bloqueiosDaTriagem(criterios).length, 0);
  assert.ok(bloqueiosDaTriagem({ ...criterios, obrigatorios: [], eliminatorios: [] }).length > 0);
  assert.ok(bloqueiosDaTriagem({ ...criterios, proposta_ia: true }).length > 0);
  assert.ok(bloqueiosDaTriagem({ ...criterios, desejaveis: ["Apenas homens"] }).length > 0);
  assert.notEqual(hashCriterios(criterios), hashCriterios({ ...criterios, desejaveis: [] }));
});

test("sem evidência literal vira não evidenciado; eliminatório só falha com evidência", () => {
  const { texto } = montarCurriculoCego(perfil);
  const resposta = JSON.stringify({
    obrigatorios: [
      { criterio: "Experiência com Node.js", estado: "atende", evidencia: "Dev Node.js" },
      { criterio: "Inglês técnico", estado: "nao_atende", evidencia: "frase inventada que não existe" },
    ],
    desejaveis: [{ criterio: "Experiência com AWS", estado: "atende", evidencia: "Node.js e AWS" }],
    resumo: "Dev backend.",
  });
  const r = resultadoDaResposta(resposta, criterios, texto, 3, []);
  assert.equal(r.obrigatorios[0].estado, "atende");
  assert.equal(r.obrigatorios[1].estado, "nao_evidenciado");
  assert.equal(r.eliminado, false);
  assert.ok(r.a_validar.some((v) => /Inglês técnico/.test(v)));
  assert.ok(r.a_validar.some((v) => /Trabalho em equipe/.test(v)));
  assert.ok(r.a_validar.some((v) => /menor que o pedido/.test(v)));

  const contra = JSON.stringify({
    obrigatorios: [
      { criterio: "Experiência com Node.js", estado: "atende", evidencia: "Dev Node.js" },
      { criterio: "Inglês técnico", estado: "nao_atende", evidencia: "Desenvolvedor Backend" },
    ],
    desejaveis: [],
  });
  const r2 = resultadoDaResposta(contra, criterios, texto, 6, []);
  assert.equal(r2.eliminado, true);
  assert.ok(/Inglês técnico/.test(r2.motivo_eliminacao));
});

test("ranking põe eliminados no fim e corte é só sugestão", () => {
  const linhas = [
    { resultado: { eliminado: true, pontuacao: 95 } },
    { resultado: { eliminado: false, pontuacao: 60 } },
    { resultado: { eliminado: false, pontuacao: 85 } },
  ];
  const o = ordenarRanking(linhas);
  assert.deepEqual(o.map((x) => x.resultado.pontuacao), [85, 60, 95]);
  assert.equal(sugerirCorte(linhas), 1);
  assert.ok(resultadoSemDados(criterios).a_validar[0].includes("não foi possível avaliar"));
});

test("resposta inválida não gera resultado", () => {
  assert.equal(resultadoDaResposta("lixo", criterios, "x", null, []), null);
});
