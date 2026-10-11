import { normalizarTexto } from "./normalizacao.js";

export const LIMITE_ESTABELECIMENTOS = 4;
const RAIO_TERRA_KM = 6371;

// Frentes do CNES compatíveis com itens do elenco do Farmácia Popular:
// as credenciadas ao programa e a rede de medicamentos básicos (CBAF).
export const GRUPO_POR_FRENTE = Object.freeze({
  CBAF: "rede_publica_basica",
  FARMACIA_POPULAR_CNES: "farmacia_popular",
});

export function calcularDistanciaKm(origem, destino) {
  const radianos = (graus) => (graus * Math.PI) / 180;
  const deltaLatitude = radianos(destino.latitude - origem.latitude);
  const deltaLongitude = radianos(destino.longitude - origem.longitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(radianos(origem.latitude)) * Math.cos(radianos(destino.latitude)) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(a));
}

// Um estabelecimento com CBAF é tratado como rede pública mesmo que também
// declare Farmácia Popular, porque a retirada pelo SUS é a informação mais forte.
export function grupoDoEstabelecimento(estabelecimento) {
  if (estabelecimento.frentes.includes("CBAF")) return GRUPO_POR_FRENTE.CBAF;
  if (estabelecimento.frentes.includes("FARMACIA_POPULAR_CNES")) return GRUPO_POR_FRENTE.FARMACIA_POPULAR_CNES;
  return null;
}

function comDistancia(estabelecimento, posicaoUsuario) {
  const temCoordenadas = estabelecimento.latitude != null && estabelecimento.longitude != null;
  const distanciaKm = posicaoUsuario && temCoordenadas ? calcularDistanciaKm(posicaoUsuario, estabelecimento) : null;
  return { ...estabelecimento, grupo: grupoDoEstabelecimento(estabelecimento), distanciaKm };
}

function compararProximidade(bairroNormalizado) {
  return (a, b) => {
    if (a.distanciaKm != null && b.distanciaKm != null) return a.distanciaKm - b.distanciaKm;
    const mesmoBairroA = bairroNormalizado && normalizarTexto(a.endereco.bairro ?? "") === bairroNormalizado;
    const mesmoBairroB = bairroNormalizado && normalizarTexto(b.endereco.bairro ?? "") === bairroNormalizado;
    if (mesmoBairroA !== mesmoBairroB) return mesmoBairroA ? -1 : 1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  };
}

export function ordenarPorProximidade(estabelecimentos, { municipio, bairro, posicaoUsuario }) {
  const comparar = compararProximidade(bairro ? normalizarTexto(bairro) : "");
  return estabelecimentos
    .filter((estabelecimento) => !municipio || estabelecimento.codigo_municipio === municipio)
    .map((estabelecimento) => comDistancia(estabelecimento, posicaoUsuario))
    .filter((estabelecimento) => estabelecimento.grupo !== null)
    .sort(comparar);
}

// Regra do projeto: com dois tipos disponíveis, 2 de cada; com um tipo só,
// até 4 dele. Vagas não preenchidas por um grupo vão para o outro.
export function selecionarComDiversidade(ordenados, limite = LIMITE_ESTABELECIMENTOS) {
  const vagasPorGrupo = limite / 2;
  const selecionados = [];
  const contagemPorGrupo = {};
  for (const estabelecimento of ordenados) {
    const contagem = contagemPorGrupo[estabelecimento.grupo] ?? 0;
    if (contagem < vagasPorGrupo) {
      selecionados.push(estabelecimento);
      contagemPorGrupo[estabelecimento.grupo] = contagem + 1;
    }
  }
  const restantes = ordenados.filter((estabelecimento) => !selecionados.includes(estabelecimento));
  const ordem = new Map(ordenados.map((estabelecimento, indice) => [estabelecimento, indice]));
  return [...selecionados, ...restantes]
    .slice(0, limite)
    .sort((a, b) => ordem.get(a) - ordem.get(b));
}
