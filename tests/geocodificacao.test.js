import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GeocodificacaoIndisponivelError,
  PRECISAO,
  completarPorCep,
  geocodificarEndereco,
  limparCep,
  montarUrlNominatim,
} from "../static/js/geocodificacao.js";

const ENDERECO = { uf: "TO", municipio: "Palmas", bairro: "Plano Diretor Norte", rua: "Avenida JK", numero: "100", cep: "" };

function buscaFalsa(respostasPorTrecho) {
  const chamadas = [];
  const buscar = async (url) => {
    chamadas.push(url);
    const [, corpo] = Object.entries(respostasPorTrecho).find(([trecho]) => url.includes(trecho)) ?? [null, []];
    return { ok: true, json: async () => corpo };
  };
  return { buscar, chamadas };
}

test("limpa CEP com máscara e rejeita tamanho errado", () => {
  assert.equal(limparCep("77001-002"), "77001002");
  assert.equal(limparCep("7700"), null);
});

test("url com rua usa nome completo do estado e número antes da rua", () => {
  const url = new URL(montarUrlNominatim(ENDERECO, PRECISAO.ENDERECO));
  assert.equal(url.searchParams.get("state"), "Tocantins");
  assert.equal(url.searchParams.get("street"), "100 Avenida JK");
  assert.equal(url.searchParams.get("countrycodes"), "br");
});

test("url de município não envia a rua", () => {
  const url = new URL(montarUrlNominatim(ENDERECO, PRECISAO.MUNICIPIO));
  assert.equal(url.searchParams.has("street"), false);
});

test("encontra pela rua com precisão de endereço", async () => {
  const { buscar } = buscaFalsa({ "street=": [{ lat: "-10.18", lon: "-48.31" }] });
  assert.deepEqual(await geocodificarEndereco(ENDERECO, buscar), {
    latitude: -10.18,
    longitude: -48.31,
    precisao: PRECISAO.ENDERECO,
  });
});

test("sem resultado pela rua, recorre ao município", async () => {
  const { buscar, chamadas } = buscaFalsa({ "street=": [], "city=Palmas": [{ lat: "-10.2", lon: "-48.3" }] });
  const posicao = await geocodificarEndereco(ENDERECO, buscar);
  assert.equal(posicao.precisao, PRECISAO.MUNICIPIO);
  assert.equal(chamadas.length, 2);
});

test("nenhum resultado retorna null", async () => {
  const { buscar } = buscaFalsa({});
  assert.equal(await geocodificarEndereco(ENDERECO, buscar), null);
});

test("falha HTTP vira erro de serviço indisponível", async () => {
  const buscar = async () => ({ ok: false, status: 503 });
  await assert.rejects(geocodificarEndereco(ENDERECO, buscar), GeocodificacaoIndisponivelError);
});

test("CEP completa só os campos vazios", async () => {
  const { buscar } = buscaFalsa({
    viacep: { logradouro: "Praça Girassóis", bairro: "Plano Diretor Norte", localidade: "Palmas", uf: "TO" },
  });
  const completo = await completarPorCep({ uf: "TO", municipio: "", bairro: "Centro", rua: "", cep: "77001-002" }, buscar);
  assert.equal(completo.rua, "Praça Girassóis");
  assert.equal(completo.bairro, "Centro");
  assert.equal(completo.municipio, "Palmas");
});

test("CEP inexistente mantém o endereço digitado", async () => {
  const { buscar } = buscaFalsa({ viacep: { erro: true } });
  const original = { ...ENDERECO, cep: "00000000" };
  assert.deepEqual(await completarPorCep(original, buscar), original);
});
