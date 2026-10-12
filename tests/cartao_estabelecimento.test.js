import { test } from "node:test";
import assert from "node:assert/strict";
import { descreverOrigem, descreverProximidade, montarUrlRota } from "../static/js/cartao_estabelecimento.js";

test("mostra km quando a distância é conhecida", () => {
  assert.equal(descreverProximidade({ referencia: "km", distanciaKm: 0.34 }), "Cerca de 0,3 km em linha reta.");
});

test("explica quando só se sabe que fica no bairro", () => {
  assert.match(descreverProximidade({ referencia: "bairro", distanciaKm: null }), /no seu bairro; a fonte não informa/);
});

test("origem da farmácia popular cita a lista oficial e o CNPJ", () => {
  const origem = descreverOrigem({ grupo: "farmacia_popular", cnpj: "61585865022716", data_credenciamento: "24/03/2006" });
  assert.equal(
    origem,
    "Fonte: lista oficial de farmácias ativas do Farmácia Popular; CNPJ 61585865022716, credenciada em 24/03/2006.",
  );
});

test("origem da rede pública cita o CNES e a competência", () => {
  const origem = descreverOrigem({ grupo: "rede_publica_basica", cnes: "2057220", competencia_cnes: "202608", cadastro_atualizado_em: null });
  assert.equal(origem, "Fonte: CNES 2057220, competência 08/2026.");
});

test("rota do Google Maps usa nome, endereço com número, município e UF", () => {
  const url = new URL(
    montarUrlRota(
      { nome: "DROGASMIL", endereco: { logradouro: "RUA A", numero: "10", bairro: "CENTRO" }, municipio: "Rio de Janeiro" },
      "RJ",
    ),
  );
  assert.equal(url.origin + url.pathname, "https://www.google.com/maps/dir/");
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("destination"), "DROGASMIL, RUA A 10, CENTRO, Rio de Janeiro - RJ");
});

test("rota omite número ausente", () => {
  const url = new URL(montarUrlRota({ nome: "UBS", endereco: { logradouro: "RUA B", numero: null, bairro: "" }, municipio: "Palmas" }, "TO"));
  assert.equal(url.searchParams.get("destination"), "UBS, RUA B, Palmas - TO");
});
