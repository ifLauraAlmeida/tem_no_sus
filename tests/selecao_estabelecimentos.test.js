import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularDistanciaKm,
  ordenarPorProximidade,
  REFERENCIA_PROXIMIDADE,
  selecionarComDiversidade,
} from "../static/js/selecao_estabelecimentos.js";

const PALMAS = "172100";
const USUARIO = { latitude: -10.18, longitude: -48.33 };

function local(nome, frentes, { latitude = null, longitude = null, bairro = "CENTRO", municipio = PALMAS } = {}) {
  return { nome, frentes, latitude, longitude, codigo_municipio: municipio, endereco: { bairro } };
}

const ubs = (nome, km, extras = {}) => local(nome, ["CBAF"], { latitude: -10.18 - km / 111, longitude: -48.33, ...extras });
const farmacia = (nome, km, extras = {}) =>
  local(nome, ["FARMACIA_POPULAR"], km == null ? extras : { latitude: -10.18 - km / 111, longitude: -48.33, ...extras });

const nomes = (lista) => lista.map((estabelecimento) => estabelecimento.nome);

test("distância entre Palmas e Porto Nacional fica entre 55 e 60 km", () => {
  const distancia = calcularDistanciaKm({ latitude: -10.1844, longitude: -48.3336 }, { latitude: -10.7081, longitude: -48.4172 });
  assert.ok(distancia > 55 && distancia < 60, `distância calculada: ${distancia}`);
});

test("com posição, ordena por km e marca a referência", () => {
  const ordenados = ordenarPorProximidade([ubs("longe", 9), ubs("perto", 1)], { posicaoUsuario: USUARIO });
  assert.deepEqual(nomes(ordenados), ["perto", "longe"]);
  assert.equal(ordenados[0].referencia, REFERENCIA_PROXIMIDADE.KM);
});

test("farmácia sem coordenada no mesmo bairro entra antes de local a 5 km", () => {
  const ordenados = ordenarPorProximidade(
    [ubs("ubs-5km", 5), farmacia("fp-bairro", null, { bairro: "Plano Diretor Sul" })],
    { posicaoUsuario: USUARIO, codigoMunicipio: PALMAS, bairro: "plano diretor sul" },
  );
  assert.deepEqual(nomes(ordenados), ["fp-bairro", "ubs-5km"]);
  assert.equal(ordenados[0].referencia, REFERENCIA_PROXIMIDADE.BAIRRO);
});

test("local sem coordenada fora do município do usuário é descartado", () => {
  const ordenados = ordenarPorProximidade([farmacia("outra-cidade", null, { municipio: "170025" })], {
    posicaoUsuario: USUARIO,
    codigoMunicipio: PALMAS,
  });
  assert.deepEqual(ordenados, []);
});

test("sem posição, usa só o município e prioriza o bairro", () => {
  const ordenados = ordenarPorProximidade(
    [ubs("centro", 1), ubs("vila", 2, { bairro: "VILA SÃO JOSÉ" }), ubs("fora", 1, { municipio: "170025" })],
    { codigoMunicipio: PALMAS, bairro: "vila sao jose" },
  );
  assert.deepEqual(nomes(ordenados), ["vila", "centro"]);
});

test("garante 2 farmácias populares mesmo com UBS mais próximas", () => {
  const ordenados = ordenarPorProximidade(
    [ubs("u1", 1), ubs("u2", 2), ubs("u3", 3), ubs("u4", 4), farmacia("fp1", 20), farmacia("fp2", 30)],
    { posicaoUsuario: USUARIO },
  );
  assert.deepEqual(nomes(selecionarComDiversidade(ordenados)), ["u1", "u2", "fp1", "fp2"]);
});

test("com um tipo só, seleciona até 4 dele", () => {
  const ordenados = ordenarPorProximidade(["a", "b", "c", "d", "e"].map((nome, i) => ubs(nome, i + 1)), {
    posicaoUsuario: USUARIO,
  });
  assert.deepEqual(nomes(selecionarComDiversidade(ordenados)), ["a", "b", "c", "d"]);
});

test("grupo com menos de 2 cede vagas ao outro", () => {
  const ordenados = ordenarPorProximidade([farmacia("fp1", 1), ubs("u1", 2), ubs("u2", 3), ubs("u3", 4)], {
    posicaoUsuario: USUARIO,
  });
  assert.deepEqual(nomes(selecionarComDiversidade(ordenados)), ["fp1", "u1", "u2", "u3"]);
});

test("restringe aos tipos de local permitidos", () => {
  const ordenados = ordenarPorProximidade([ubs("ubs", 1), farmacia("fp", 1)], {
    posicaoUsuario: USUARIO,
    gruposPermitidos: new Set(["rede_publica_basica"]),
  });
  assert.deepEqual(nomes(ordenados), ["ubs"]);
});

test("ignora frentes sem relação com os medicamentos consultados", () => {
  const ordenados = ordenarPorProximidade([local("ceaf", ["CEAF"], { latitude: -10.18, longitude: -48.33 })], {
    posicaoUsuario: USUARIO,
  });
  assert.deepEqual(ordenados, []);
});
