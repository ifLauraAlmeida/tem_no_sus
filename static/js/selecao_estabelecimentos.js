import { normalizarTexto } from "./normalizacao.js";

export const LIMITE_ESTABELECIMENTOS = 4;
const VAGAS_POR_GRUPO = 2;
const RAIO_TERRA_KM = 6371;

// Rede básica vem do CNES (125/005); Farmácia Popular vem da lista oficial
// de farmácias ativas do programa, que prevalece sobre o cadastro do CNES.
export const GRUPO_POR_FRENTE = Object.freeze({
  CBAF: "rede_publica_basica",
  FARMACIA_POPULAR: "farmacia_popular",
});

export const REFERENCIA_PROXIMIDADE = Object.freeze({ KM: "km", BAIRRO: "bairro", MUNICIPIO: "municipio" });

// Locais sem coordenada (60% das farmácias credenciadas) entram na ordenação
// com uma distância presumida: no mesmo bairro, perto; no mesmo município,
// mais longe. Valores aproximados, só para intercalar com os que têm km.
const DISTANCIA_PRESUMIDA_KM = Object.freeze({ bairro: 1.5, municipio: 6 });

export function calcularDistanciaKm(origem, destino) {
  const radianos = (graus) => (graus * Math.PI) / 180;
  const deltaLatitude = radianos(destino.latitude - origem.latitude);
  const deltaLongitude = radianos(destino.longitude - origem.longitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(radianos(origem.latitude)) * Math.cos(radianos(destino.latitude)) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(a));
}

export function grupoDoEstabelecimento(estabelecimento) {
  if (estabelecimento.frentes.includes("FARMACIA_POPULAR")) return GRUPO_POR_FRENTE.FARMACIA_POPULAR;
  if (estabelecimento.frentes.includes("CBAF")) return GRUPO_POR_FRENTE.CBAF;
  return null;
}

function temCoordenadas(estabelecimento) {
  return estabelecimento.latitude != null && estabelecimento.longitude != null;
}

function proximidadeRelativa(estabelecimento, { posicaoUsuario, codigoMunicipio, bairro }) {
  if (posicaoUsuario && temCoordenadas(estabelecimento)) {
    const distanciaKm = calcularDistanciaKm(posicaoUsuario, estabelecimento);
    return { distanciaKm, referencia: REFERENCIA_PROXIMIDADE.KM, ordem: distanciaKm };
  }
  if (!codigoMunicipio || estabelecimento.codigo_municipio !== codigoMunicipio) return null;
  const mesmoBairro = bairro && normalizarTexto(estabelecimento.endereco.bairro ?? "") === normalizarTexto(bairro);
  const referencia = mesmoBairro ? REFERENCIA_PROXIMIDADE.BAIRRO : REFERENCIA_PROXIMIDADE.MUNICIPIO;
  return { distanciaKm: null, referencia, ordem: DISTANCIA_PRESUMIDA_KM[referencia] };
}

// Sem posição do usuário, só entram locais do município informado.
// gruposPermitidos restringe aos tipos compatíveis com os medicamentos.
export function ordenarPorProximidade(estabelecimentos, filtros) {
  const grupoAceito = (grupo) => grupo !== null && (!filtros.gruposPermitidos || filtros.gruposPermitidos.has(grupo));
  return estabelecimentos
    .map((estabelecimento) => ({ estabelecimento, grupo: grupoDoEstabelecimento(estabelecimento) }))
    .filter(({ grupo }) => grupoAceito(grupo))
    .map(({ estabelecimento, grupo }) => ({ ...estabelecimento, grupo, ...proximidadeRelativa(estabelecimento, filtros) }))
    .filter((estabelecimento) => estabelecimento.referencia !== undefined)
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
}

// Regra do projeto: com dois tipos disponíveis, 2 de cada (garante 2 do
// Farmácia Popular quando o medicamento está no programa); com um tipo só,
// até 4 dele. Vagas que um grupo não preenche vão para o outro.
export function selecionarComDiversidade(ordenados, limite = LIMITE_ESTABELECIMENTOS) {
  const contagemPorGrupo = {};
  const selecionados = ordenados.filter((estabelecimento) => {
    const contagem = contagemPorGrupo[estabelecimento.grupo] ?? 0;
    if (contagem >= VAGAS_POR_GRUPO) return false;
    contagemPorGrupo[estabelecimento.grupo] = contagem + 1;
    return true;
  });
  const restantes = ordenados.filter((estabelecimento) => !selecionados.includes(estabelecimento));
  const escolhidos = new Set([...selecionados.slice(0, limite), ...restantes].slice(0, limite));
  return ordenados.filter((estabelecimento) => escolhidos.has(estabelecimento));
}
