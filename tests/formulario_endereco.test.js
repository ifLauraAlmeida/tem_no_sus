import { test } from "node:test";
import assert from "node:assert/strict";
import { camposFaltantesSemCep, descreverCandidato } from "../static/js/formulario_endereco.js";

test("sem CEP, exige estado, município e rua", () => {
  assert.deepEqual(camposFaltantesSemCep({ uf: "TO", municipio: "", rua: "", numero: "" }), ["município", "rua"]);
});

test("número é opcional para descobrir o CEP", () => {
  assert.deepEqual(camposFaltantesSemCep({ uf: "TO", municipio: "Palmas", rua: "Avenida JK", numero: "" }), []);
});

test("descreve candidato com faixa de número e CEP formatado", () => {
  const descricao = descreverCandidato({
    cep: "20520054",
    rua: "Rua Conde de Bonfim",
    complemento: "de 0188 a 0528 - lado par",
    bairro: "Tijuca",
    municipio: "Rio de Janeiro",
    uf: "RJ",
  });
  assert.equal(descricao, "20520-054 — Rua Conde de Bonfim (de 0188 a 0528 - lado par), Tijuca, Rio de Janeiro/RJ");
});
