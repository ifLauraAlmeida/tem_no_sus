import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularDistanciaKm,
  ordenarPorProximidade,
  selecionarComDiversidade,
} from "../static/js/selecao_estabelecimentos.js";

function estabelecimento(nome, frentes, { latitude = null, longitude = null, bairro = "CENTRO", municipio = "172100" } = {}) {
  return { cnes: nome, nome, frentes, latitude, longitude, codigo_municipio: municipio, endereco: { bairro } };
}

test("distância entre Palmas e Porto Nacional fica entre 55 e 60 km", () => {
  const palmas = { latitude: -10.1844, longitude: -48.3336 };
  const portoNacional = { latitude: -10.7081, longitude: -48.4172 };
  const distancia = calcularDistanciaKm(palmas, portoNacional);
  assert.ok(distancia > 55 && distancia < 60, `distância calculada: ${distancia}`);
});

test("ordena pela distância quando há posição do usuário", () => {
  const perto = estabelecimento("perto", ["CBAF"], { latitude: -10.18, longitude: -48.33 });
  const longe = estabelecimento("longe", ["CBAF"], { latitude: -10.7, longitude: -48.4 });
  const ordenados = ordenarPorProximidade([longe, perto], { posicaoUsuario: { latitude: -10.18, longitude: -48.33 } });
  assert.deepEqual(ordenados.map((e) => e.nome), ["perto", "longe"]);
});

test("sem posição, prioriza o bairro informado ignorando acentos", () => {
  const centro = estabelecimento("a centro", ["CBAF"]);
  const vila = estabelecimento("z vila", ["CBAF"], { bairro: "VILA SÃO JOSÉ" });
  const ordenados = ordenarPorProximidade([centro, vila], { bairro: "vila sao jose" });
  assert.deepEqual(ordenados.map((e) => e.nome), ["z vila", "a centro"]);
});

test("filtra pelo município e exclui frentes sem relação com o elenco", () => {
  const ceaf = estabelecimento("ceaf", ["CEAF"]);
  const outraCidade = estabelecimento("outra", ["CBAF"], { municipio: "170025" });
  const ubs = estabelecimento("ubs", ["CBAF", "CEAF"]);
  const ordenados = ordenarPorProximidade([ceaf, outraCidade, ubs], { municipio: "172100" });
  assert.deepEqual(ordenados.map((e) => e.nome), ["ubs"]);
});

test("com dois tipos, seleciona 2 de cada mantendo a ordem de proximidade", () => {
  const ordenados = ordenarPorProximidade(
    [
      estabelecimento("ubs1", ["CBAF"]),
      estabelecimento("ubs2", ["CBAF"]),
      estabelecimento("ubs3", ["CBAF"]),
      estabelecimento("fp1", ["FARMACIA_POPULAR_CNES"]),
      estabelecimento("fp2", ["FARMACIA_POPULAR_CNES"]),
    ],
    {},
  );
  assert.deepEqual(selecionarComDiversidade(ordenados).map((e) => e.nome), ["fp1", "fp2", "ubs1", "ubs2"]);
});

test("com um tipo só, seleciona até 4 dele", () => {
  const ordenados = ordenarPorProximidade(
    ["a", "b", "c", "d", "e"].map((nome) => estabelecimento(nome, ["CBAF"])),
    {},
  );
  assert.deepEqual(selecionarComDiversidade(ordenados).map((e) => e.nome), ["a", "b", "c", "d"]);
});

test("grupo com menos de 2 cede vagas ao outro", () => {
  const ordenados = ordenarPorProximidade(
    [
      estabelecimento("fp1", ["FARMACIA_POPULAR_CNES"]),
      ...["u1", "u2", "u3", "u4"].map((nome) => estabelecimento(nome, ["CBAF"])),
    ],
    {},
  );
  assert.deepEqual(selecionarComDiversidade(ordenados).map((e) => e.nome), ["fp1", "u1", "u2", "u3"]);
});

test("diversidade não traz estabelecimento muito mais distante que os próximos", () => {
  const usuario = { latitude: -22.92, longitude: -43.23 };
  const ubsPerto = ["u1", "u2", "u3", "u4"].map((nome, indice) =>
    estabelecimento(nome, ["CBAF"], { latitude: -22.92 - indice * 0.005, longitude: -43.23 }),
  );
  const farmaciaLonge = estabelecimento("fp-longe", ["FARMACIA_POPULAR_CNES"], { latitude: -22.4, longitude: -43.6 });
  const ordenados = ordenarPorProximidade([...ubsPerto, farmaciaLonge], { posicaoUsuario: usuario });
  assert.deepEqual(selecionarComDiversidade(ordenados).map((e) => e.nome), ["u1", "u2", "u3", "u4"]);
});

test("se o mais próximo já está longe, aceita os demais até o dobro da distância", () => {
  const usuario = { latitude: -10, longitude: -48 };
  const ordenados = ordenarPorProximidade(
    [
      estabelecimento("ubs-30km", ["CBAF"], { latitude: -10.27, longitude: -48 }),
      estabelecimento("fp-50km", ["FARMACIA_POPULAR_CNES"], { latitude: -10.45, longitude: -48 }),
    ],
    { posicaoUsuario: usuario },
  );
  assert.deepEqual(selecionarComDiversidade(ordenados).map((e) => e.nome), ["ubs-30km", "fp-50km"]);
});
