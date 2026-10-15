import { test } from "node:test";
import assert from "node:assert/strict";
import { montarEndereco, normalizarCep, formatarCep, ufValida, telefoneOpcional } from "../empresas.ts";

test("monta o endereço completo", () => {
  assert.equal(
    montarEndereco({
      logradouro: "Rua das Flores",
      numero: "100",
      complemento: "Sala 2",
      bairro: "Centro",
      cidade: "Caieiras",
      uf: "sp",
      cep: "07700000",
    }),
    "Rua das Flores, 100, Sala 2 — Centro, Caieiras/SP — CEP 07700-000",
  );
});

test("endereço parcial e vazio", () => {
  assert.equal(montarEndereco({ cidade: "São Paulo", uf: "SP" }), "São Paulo/SP");
  assert.equal(montarEndereco({}), null);
  assert.equal(montarEndereco({ logradouro: " ", numero: "" }), null);
});

test("CEP", () => {
  assert.equal(normalizarCep("07700-000"), "07700000");
  assert.equal(normalizarCep("123"), null);
  assert.equal(formatarCep("07700000"), "07700-000");
});

test("UF", () => {
  assert.equal(ufValida("SP"), true);
  assert.equal(ufValida("sp"), true);
  assert.equal(ufValida("XX"), false);
  assert.equal(ufValida(""), false);
});

test("telefone opcional: vazio é null, inválido é undefined", () => {
  assert.equal(telefoneOpcional(""), null);
  assert.equal(telefoneOpcional("(11) 99999-9999"), "5511999999999");
  assert.equal(telefoneOpcional("123"), undefined);
});
