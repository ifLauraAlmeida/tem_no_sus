import { test } from "node:test";
import assert from "node:assert/strict";
import { mensagemOQueLevar } from "../static/js/orientacoes_retirada.js";

// Ambiente de teste sem DOM: um documento mínimo basta para montar os blocos.
globalThis.document = {
  createElement: (tag) => ({
    tag, filhos: [], className: "", textContent: "",
    append(...itens) { this.filhos.push(...itens); },
    setAttribute() {},
  }),
};

function titulos(blocos) {
  return blocos.slice(1).map((secao) => secao.filhos[0].textContent);
}

test("com farmácia popular e rede pública, mostra as duas seções e a de receitas especiais", () => {
  const blocos = mensagemOQueLevar(new Set(["farmacia_popular", "rede_publica_basica"]));
  assert.deepEqual(titulos(blocos), [
    "Na farmácia do Farmácia Popular",
    "Na UBS ou farmácia municipal",
    "Se o medicamento for controlado ou antibiótico",
  ]);
});

test("só rede pública omite a seção do Farmácia Popular", () => {
  const blocos = mensagemOQueLevar(new Set(["rede_publica_basica"]));
  assert.deepEqual(titulos(blocos), ["Na UBS ou farmácia municipal", "Se o medicamento for controlado ou antibiótico"]);
});
