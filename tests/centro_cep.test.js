import { test } from "node:test";
import assert from "node:assert/strict";
import { buscarCentroCep } from "../static/js/centro_cep.js";

function buscaFalsa(arquivos) {
  const chamadas = [];
  const buscar = async (url) => {
    chamadas.push(url);
    const prefixo = url.match(/(\d{3})\.json$/)[1];
    if (!(prefixo in arquivos)) return { ok: false, status: 404 };
    return { ok: true, status: 200, json: async () => arquivos[prefixo] };
  };
  return { buscar, chamadas };
}

test("devolve o centro do CEP com a precisão marcada", async () => {
  const { buscar } = buscaFalsa({ "205": { "20520054": [-22.92315, -43.23111, 681] } });
  assert.deepEqual(await buscarCentroCep("20520054", buscar), { latitude: -22.92315, longitude: -43.23111, precisao: "centro_cep" });
});

test("CEP fora do CNEFE ou prefixo inexistente devolve null", async () => {
  const { buscar } = buscaFalsa({ "206": { "20600000": [-22.9, -43.2, 10] } });
  assert.equal(await buscarCentroCep("20699999", buscar), null);
  assert.equal(await buscarCentroCep("99999999", buscar), null);
});

test("baixa cada prefixo uma vez só", async () => {
  const { buscar, chamadas } = buscaFalsa({ "301": { "30140071": [-19.93, -43.94, 5] } });
  await buscarCentroCep("30140071", buscar);
  await buscarCentroCep("30140072", buscar);
  assert.equal(chamadas.length, 1);
});
