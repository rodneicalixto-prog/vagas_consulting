import { test } from "node:test";
import assert from "node:assert/strict";
import { validarNota, slugNota, montarNotaMd, tipoNotaValido, provedorAgenteValido, tomValido } from "../agente.ts";

test("valida nota: título, tipo e tamanho", () => {
  assert.equal(validarNota({ titulo: "Horário de atendimento", tipo: "faq", corpo_md: "Das 8h às 18h." }), null);
  assert.match(validarNota({ titulo: "ab", tipo: "faq", corpo_md: "" }), /título/i);
  assert.match(validarNota({ titulo: "Titulo valido", tipo: "outro", corpo_md: "" }), /tipo/i);
  assert.match(validarNota({ titulo: "Titulo valido", tipo: "faq", corpo_md: "x".repeat(20001) }), /texto/i);
});

test("slug estável, sem acento nem símbolos", () => {
  assert.equal(slugNota("Política de Salário (v2)"), "politica-de-salario-v2");
  assert.equal(slugNota("  ??? "), "nota");
  assert.ok(slugNota("a".repeat(300)).length <= 80);
});

test("nota exportada tem cabeçalho de propriedades do Obsidian", () => {
  const md = montarNotaMd({
    titulo: 'Pergunta "difícil"',
    tipo: "faq",
    status: "aprovada",
    versao: 3,
    atualizadoEm: "2026-10-15",
    corpo_md: "  Resposta objetiva.  ",
  });
  assert.ok(md.startsWith("---\n"));
  assert.ok(md.includes('titulo: "Pergunta \\"difícil\\""'));
  assert.ok(md.includes("tipo: faq") && md.includes("versao: 3"));
  assert.ok(md.includes("# Pergunta \"difícil\"\n\nResposta objetiva.\n"));
});

test("valores permitidos", () => {
  assert.equal(tipoNotaValido("licao"), true);
  assert.equal(tipoNotaValido("x"), false);
  assert.equal(provedorAgenteValido("groq"), true);
  assert.equal(provedorAgenteValido("grok"), false);
  assert.equal(tomValido("formal"), true);
});
