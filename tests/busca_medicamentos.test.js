import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buscarMedicamento,
  separarEntradas,
  SITUACAO,
} from "../static/js/busca_medicamentos.js";

const elenco = JSON.parse(
  readFileSync(new URL("../data/reference/farmacia_popular_elenco.json", import.meta.url)),
);
const itens = elenco.itens;

function ids(resultado) {
  return resultado.itens.map((item) => item.id);
}

test("identifica losartana com dosagem simplificada", () => {
  const resultado = buscarMedicamento("losartana 50", itens);
  assert.equal(resultado.situacao, SITUACAO.IDENTIFICADO);
  assert.deepEqual(ids(resultado), ["pfpb-019"]);
});

test("identifica metformina 850 mg com acento e caixa diferentes", () => {
  const resultado = buscarMedicamento("Cloridrato de METFORMINA 850mg", itens);
  assert.deepEqual(ids(resultado), ["pfpb-010"]);
});

test("metformina 500 é ambígua entre liberação imediata e prolongada", () => {
  const resultado = buscarMedicamento("metformina 500", itens);
  assert.equal(resultado.situacao, SITUACAO.AMBIGUO);
  assert.deepEqual(ids(resultado), ["pfpb-008", "pfpb-009"]);
});

test("sem dosagem, lista todas as concentrações como ambíguo", () => {
  const resultado = buscarMedicamento("sinvastatina", itens);
  assert.equal(resultado.situacao, SITUACAO.AMBIGUO);
  assert.equal(resultado.itens.length, 3);
});

test("concentração fora do elenco é sinalizada e mostra as disponíveis", () => {
  const resultado = buscarMedicamento("losartana 100 mg", itens);
  assert.equal(resultado.situacao, SITUACAO.CONCENTRACAO_NAO_LISTADA);
  assert.deepEqual(ids(resultado), ["pfpb-019"]);
});

test("medicamento fora do elenco não é identificado", () => {
  const resultado = buscarMedicamento("dipirona 500 mg", itens);
  assert.equal(resultado.situacao, SITUACAO.NAO_IDENTIFICADO);
  assert.deepEqual(resultado.itens, []);
});

test("não associa termo parcial dentro de outra palavra", () => {
  const resultado = buscarMedicamento("metoprololzzz", itens);
  assert.equal(resultado.situacao, SITUACAO.NAO_IDENTIFICADO);
});

test("termo mais específico prevalece entre insulinas", () => {
  const resultado = buscarMedicamento("insulina regular", itens);
  assert.deepEqual(ids(resultado), ["pfpb-012"]);
});

test("insulina sem tipo é ambígua", () => {
  const resultado = buscarMedicamento("insulina", itens);
  assert.equal(resultado.situacao, SITUACAO.AMBIGUO);
  assert.deepEqual(ids(resultado), ["pfpb-012", "pfpb-013"]);
});

test("levodopa com dosagem distingue a associação", () => {
  const resultado = buscarMedicamento("levodopa 250", itens);
  assert.deepEqual(ids(resultado), ["pfpb-032"]);
});

test("separa receita por linha e ponto e vírgula, preservando vírgula decimal", () => {
  assert.deepEqual(
    separarEntradas("losartana 50\n\nipratrópio 0,25 mg; sinvastatina 20"),
    ["losartana 50", "ipratrópio 0,25 mg", "sinvastatina 20"],
  );
});
