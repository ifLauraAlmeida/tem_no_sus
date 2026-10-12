import { buscarMedicamento, SITUACAO } from "./busca_medicamentos.js";
import { GRUPO_POR_FRENTE } from "./selecao_estabelecimentos.js";

export const COBERTURA = Object.freeze({
  COBERTO: "coberto",
  CONCENTRACAO_DIFERENTE: "concentracao_diferente",
  NAO_COBERTO: "nao_coberto",
});

const SITUACOES_COBERTAS = new Set([
  SITUACAO.IDENTIFICADO,
  SITUACAO.SEM_CONCENTRACAO_INFORMADA,
  SITUACAO.AMBIGUO,
]);

function classificarCobertura(resultados) {
  if (resultados.some((resultado) => SITUACOES_COBERTAS.has(resultado.situacao))) return COBERTURA.COBERTO;
  if (resultados.some((resultado) => resultado.situacao === SITUACAO.CONCENTRACAO_NAO_LISTADA)) {
    return COBERTURA.CONCENTRACAO_DIFERENTE;
  }
  return COBERTURA.NAO_COBERTO;
}

// Itens do Farmácia Popular podem ser retirados nas drogarias do programa e,
// em geral, também na rede básica; itens só da RENAME, apenas na rede pública.
function gruposDeRetirada(farmaciaPopular, componenteBasico) {
  const grupos = new Set();
  if (farmaciaPopular.itens.length > 0) {
    grupos.add(GRUPO_POR_FRENTE.FARMACIA_POPULAR_CNES).add(GRUPO_POR_FRENTE.CBAF);
  }
  if (componenteBasico.itens.length > 0) grupos.add(GRUPO_POR_FRENTE.CBAF);
  return grupos;
}

export function consultarCobertura(entrada, bases) {
  const farmaciaPopular = buscarMedicamento(entrada, bases.farmaciaPopular.itens);
  const componenteBasico = buscarMedicamento(entrada, bases.componenteBasico.itens);
  return {
    entrada,
    farmaciaPopular,
    componenteBasico,
    cobertura: classificarCobertura([farmaciaPopular, componenteBasico]),
    gruposDeRetirada: gruposDeRetirada(farmaciaPopular, componenteBasico),
  };
}

export function unirGruposDeRetirada(consultas) {
  return new Set(consultas.flatMap((consulta) => [...consulta.gruposDeRetirada]));
}
