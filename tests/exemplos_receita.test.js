import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MEDICAMENTOS_EXEMPLO, sortearExemplo } from "../static/js/exemplos_receita.js";
import { COBERTURA, consultarCobertura } from "../static/js/consulta_cobertura.js";
import { separarEntradas } from "../static/js/busca_medicamentos.js";

const lerReferencia = (arquivo) => JSON.parse(readFileSync(new URL(`../data/reference/${arquivo}`, import.meta.url)));
const bases = {
  farmaciaPopular: lerReferencia("farmacia_popular_elenco.json"),
  componenteBasico: lerReferencia("rename_2024_componente_basico.json"),
  nomesComerciais: lerReferencia("nomes_comerciais.json"),
};

function sequencia(...valores) {
  let posicao = 0;
  return () => valores[posicao++ % valores.length];
}

test("todo medicamento de exemplo é coberto pelas listas", () => {
  MEDICAMENTOS_EXEMPLO.forEach((medicamento) => {
    assert.equal(consultarCobertura(medicamento, bases).cobertura, COBERTURA.COBERTO, medicamento);
  });
});

test("sorteia um medicamento", () => {
  assert.equal(sortearExemplo("", sequencia(0.1, 0)), "Losartana 50 mg");
});

test("sorteia dois medicamentos diferentes separados por ponto e vírgula", () => {
  const exemplo = sortearExemplo("", sequencia(0.9, 0, 0));
  assert.equal(exemplo, "Losartana 50 mg; Metformina 850 mg");
  assert.equal(separarEntradas(exemplo).length, 2);
});

test("não repete o exemplo atual", () => {
  assert.equal(sortearExemplo("Losartana 50 mg", sequencia(0.1, 0, 0.1, 0.1)), "Metformina 850 mg");
});
