import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buscarCepsPorEndereco,
  buscarEnderecoPorCep,
  interpretarComplemento,
  ordenarCandidatosPorNumero,
} from "../static/js/consulta_cep.js";

function resposta(corpo, status = 200) {
  return async () => ({ ok: status < 400, status, json: async () => corpo });
}

const CONDE_DE_BONFIM = [
  { cep: "20520-050", complemento: "até 0223 - lado ímpar" },
  { cep: "20530-003", complemento: "de 0988 ao fim - lado par" },
  { cep: "20530-002", complemento: "de 0684 a 0986 - lado par" },
  { cep: "20530-000", complemento: "de 0715 a 0999 - lado ímpar" },
  { cep: "20520-054", complemento: "de 0188 a 0528 - lado par" },
].map((item) => ({ ...item, logradouro: "Rua Conde de Bonfim", bairro: "Tijuca", localidade: "Rio de Janeiro", uf: "RJ" }));

test("interpreta faixas, lado e número único do complemento", () => {
  assert.deepEqual(interpretarComplemento("até 0223 - lado ímpar"), { tipo: "faixa", minimo: 0, maximo: 223, paridade: "impar" });
  assert.deepEqual(interpretarComplemento("de 0684 a 0986 - lado par"), { tipo: "faixa", minimo: 684, maximo: 986, paridade: "par" });
  assert.deepEqual(interpretarComplemento("de 1001/1002 ao fim"), { tipo: "faixa", minimo: 1001, maximo: Infinity, paridade: null });
  assert.deepEqual(interpretarComplemento("1374 12 Andar"), { tipo: "numero", numero: 1374 });
  assert.deepEqual(interpretarComplemento(""), { tipo: "livre" });
});

test("número 500 (par) escolhe só a faixa de 188 a 528 lado par", async () => {
  const ceps = await buscarCepsPorEndereco(
    { uf: "RJ", municipio: "Rio de Janeiro", rua: "Conde de Bonfim", numero: "500" },
    resposta(CONDE_DE_BONFIM),
  );
  assert.deepEqual(ceps.map((endereco) => endereco.cep), ["20520054"]);
});

test("sem número, mantém faixas e descarta CEP de prédio específico", () => {
  const enderecos = [
    { cep: "01310928", complemento: "2064" },
    { cep: "01311200", complemento: "de 1047 a 1865 - lado ímpar" },
    { cep: "01310100", complemento: "" },
  ];
  assert.deepEqual(ordenarCandidatosPorNumero(enderecos, "").map((e) => e.cep), ["01311200", "01310100"]);
});

test("CEP de prédio com o mesmo número vem primeiro", () => {
  const enderecos = [
    { cep: "01310100", complemento: "" },
    { cep: "01310928", complemento: "2064" },
  ];
  assert.deepEqual(ordenarCandidatosPorNumero(enderecos, "2064").map((e) => e.cep), ["01310928", "01310100"]);
});

test("rua ou município curtos demais não consultam o serviço", async () => {
  const buscar = async () => assert.fail("não deveria consultar");
  assert.deepEqual(await buscarCepsPorEndereco({ uf: "TO", municipio: "Palmas", rua: "Q1", numero: "" }, buscar), []);
});

test("converte endereço do CEP e retorna null para CEP inexistente", async () => {
  const endereco = await buscarEnderecoPorCep(
    "77001-002",
    resposta({ cep: "77001-002", logradouro: "Praça Girassóis", bairro: "Plano Diretor Norte", localidade: "Palmas", uf: "TO", ibge: "1721000" }),
  );
  assert.deepEqual(endereco, {
    cep: "77001002",
    rua: "Praça Girassóis",
    complemento: "",
    bairro: "Plano Diretor Norte",
    municipio: "Palmas",
    codigoMunicipio: "172100",
    uf: "TO",
  });
  assert.equal(await buscarEnderecoPorCep("00000000", resposta({ erro: true })), null);
});

test("CEP com tamanho errado é rejeitado antes da consulta", async () => {
  await assert.rejects(buscarEnderecoPorCep("1234", resposta({})), RangeError);
});
