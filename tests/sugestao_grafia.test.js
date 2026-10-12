import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { aplicarSugestao, distanciaEdicao, sugerirGrafias } from "../static/js/sugestao_grafia.js";

const { itens } = JSON.parse(
  readFileSync(new URL("../data/reference/farmacia_popular_elenco.json", import.meta.url)),
);

test("distância de edição conta inserções, remoções e trocas", () => {
  assert.equal(distanciaEdicao("losartan", "losartana"), 1);
  assert.equal(distanciaEdicao("metfromina", "metformina"), 2);
  assert.equal(distanciaEdicao("abc", "abc"), 0);
});

test("sugere losartana para losartan", () => {
  assert.deepEqual(sugerirGrafias("Losartan 50mg", itens), ["losartana"]);
});

test("sugere metformina para letras trocadas", () => {
  assert.deepEqual(sugerirGrafias("metfromina 850", itens), ["metformina"]);
});

test("sugere sinvastatina para simvastatina", () => {
  assert.deepEqual(sugerirGrafias("simvastatina", itens), ["sinvastatina"]);
});

test("não sugere nada para medicamento sem nome parecido", () => {
  assert.deepEqual(sugerirGrafias("dipirona 500 mg", itens), []);
});

test("mantém a dosagem digitada ao aplicar a sugestão", () => {
  assert.equal(aplicarSugestao("Losartan 50mg", "losartana"), "losartana 50 mg");
  assert.equal(aplicarSugestao("simvastatina", "sinvastatina"), "sinvastatina");
});
