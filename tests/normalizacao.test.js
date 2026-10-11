import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarTexto, extrairDosagens } from "../static/js/normalizacao.js";

test("remove acentos, caixa e separa número da unidade", () => {
  assert.equal(normalizarTexto("LOSARTANA Potássica 50MG"), "losartana potassica 50 mg");
});

test("colapsa espaços e pontuação irrelevante", () => {
  assert.equal(normalizarTexto("  metformina   -  850 mg. "), "metformina 850 mg.");
});

test("extrai dosagens com vírgula decimal", () => {
  assert.deepEqual(extrairDosagens("etinilestradiol 0,03mg + levonorgestrel 0,15mg"), [0.03, 0.15]);
});

test("entrada sem dosagem retorna lista vazia", () => {
  assert.deepEqual(extrairDosagens("sinvastatina"), []);
});
