import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolverNomeComercial } from "../static/js/nomes_comerciais.js";
import { COBERTURA, consultarCobertura } from "../static/js/consulta_cobertura.js";

const lerReferencia = (arquivo) =>
  JSON.parse(readFileSync(new URL(`../data/reference/${arquivo}`, import.meta.url)));
const bases = {
  farmaciaPopular: lerReferencia("farmacia_popular_elenco.json"),
  componenteBasico: lerReferencia("rename_2024_componente_basico.json"),
  nomesComerciais: lerReferencia("nomes_comerciais.json"),
};

test("troca a marca pelo princípio ativo mantendo a dosagem", () => {
  assert.deepEqual(resolverNomeComercial("Aerolin 100mcg", { aerolin: ["salbutamol"] }), {
    marca: "aerolin",
    principios: ["salbutamol"],
    entradaConvertida: "salbutamol 100",
  });
});

test("mantém vírgula decimal ao converter dosagem", () => {
  const resultado = resolverNomeComercial("Xpto 0,25 mg", { xpto: ["ipratropio"] });
  assert.equal(resultado.entradaConvertida, "ipratropio 0,25");
});

test("sem marca conhecida retorna null", () => {
  assert.equal(resolverNomeComercial("remedio qualquer", { aerolin: ["salbutamol"] }), null);
});

test("Aerolin é identificado como salbutamol e coberto pelo Farmácia Popular", () => {
  const consulta = consultarCobertura("Aerolin", bases);
  assert.equal(consulta.cobertura, COBERTURA.COBERTO);
  assert.equal(consulta.nomeComercial.marca, "aerolin");
  assert.ok(consulta.farmaciaPopular.itens.every((item) => item.principio_ativo === "sulfato de salbutamol"));
  assert.ok(consulta.gruposDeRetirada.has("farmacia_popular"));
});

test("princípio ativo digitado não passa pela troca de marca", () => {
  const consulta = consultarCobertura("losartana 50", bases);
  assert.equal(consulta.nomeComercial, null);
});
