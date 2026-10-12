import { test } from "node:test";
import assert from "node:assert/strict";
import { camposFaltantes } from "../static/js/formulario_endereco.js";

test("lista campos mínimos ausentes do endereço", () => {
  assert.deepEqual(camposFaltantes({ uf: "TO", municipio: "", bairro: "Centro", rua: "" }), ["município", "rua"]);
});

test("número e CEP são opcionais", () => {
  assert.deepEqual(camposFaltantes({ uf: "TO", municipio: "Palmas", bairro: "Centro", rua: "Rua 1", numero: "", cep: "" }), []);
});
