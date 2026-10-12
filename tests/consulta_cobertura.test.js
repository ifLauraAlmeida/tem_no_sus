import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COBERTURA, consultarCobertura, unirGruposDeRetirada } from "../static/js/consulta_cobertura.js";

function lerBase(caminho) {
  return JSON.parse(readFileSync(new URL(`../data/reference/${caminho}`, import.meta.url)));
}

const bases = {
  farmaciaPopular: lerBase("farmacia_popular_elenco.json"),
  componenteBasico: lerBase("rename_2024_componente_basico.json"),
};

test("losartana consta nas duas bases e pode ser retirada nos dois tipos de local", () => {
  const consulta = consultarCobertura("losartana 50 mg", bases);
  assert.equal(consulta.cobertura, COBERTURA.COBERTO);
  assert.equal(consulta.farmaciaPopular.itens.length, 1);
  assert.equal(consulta.componenteBasico.itens.length, 1);
  assert.deepEqual([...consulta.gruposDeRetirada].sort(), ["farmacia_popular", "rede_publica_basica"]);
});

test("dipirona só consta no componente básico e só indica rede pública", () => {
  const consulta = consultarCobertura("dipirona 500 mg", bases);
  assert.equal(consulta.cobertura, COBERTURA.COBERTO);
  assert.equal(consulta.farmaciaPopular.itens.length, 0);
  assert.deepEqual([...consulta.gruposDeRetirada], ["rede_publica_basica"]);
});

test("concentração ausente nas duas bases é sinalizada", () => {
  const consulta = consultarCobertura("losartana 100 mg", bases);
  assert.equal(consulta.cobertura, COBERTURA.CONCENTRACAO_DIFERENTE);
});

test("nome inexistente não é coberto e não indica locais", () => {
  const consulta = consultarCobertura("remedioinventado 10 mg", bases);
  assert.equal(consulta.cobertura, COBERTURA.NAO_COBERTO);
  assert.equal(consulta.gruposDeRetirada.size, 0);
});

test("une os tipos de local de todas as consultas", () => {
  const consultas = ["dipirona 500 mg", "remedioinventado"].map((entrada) => consultarCobertura(entrada, bases));
  assert.deepEqual([...unirGruposDeRetirada(consultas)], ["rede_publica_basica"]);
});
