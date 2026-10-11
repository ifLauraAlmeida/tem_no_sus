import { normalizarTexto, extrairDosagens } from "./normalizacao.js";

export const SITUACAO = Object.freeze({
  IDENTIFICADO: "identificado",
  SEM_CONCENTRACAO_INFORMADA: "sem_concentracao_informada",
  AMBIGUO: "ambiguo",
  CONCENTRACAO_NAO_LISTADA: "concentracao_nao_listada",
  NAO_IDENTIFICADO: "nao_identificado",
});

function contemTermo(entradaNormalizada, termo) {
  return ` ${entradaNormalizada} `.includes(` ${normalizarTexto(termo)} `);
}

function tamanhoMaiorTermo(item, entradaNormalizada) {
  const termosEncontrados = item.termos_busca.filter((termo) =>
    contemTermo(entradaNormalizada, termo),
  );
  return Math.max(0, ...termosEncontrados.map((termo) => termo.length));
}

// Mantém só os itens cujo termo encontrado é o mais específico,
// para que "insulina regular" não traga também a insulina NPH.
function filtrarPorPrincipioAtivo(itens, entradaNormalizada) {
  const pontuados = itens.map((item) => ({
    item,
    tamanho: tamanhoMaiorTermo(item, entradaNormalizada),
  }));
  const maiorTamanho = Math.max(0, ...pontuados.map((p) => p.tamanho));
  if (maiorTamanho === 0) return [];
  return pontuados.filter((p) => p.tamanho === maiorTamanho).map((p) => p.item);
}

function possuiDosagens(item, dosagensInformadas) {
  const dosagensItem = extrairDosagens(item.descricao_original);
  return dosagensInformadas.every((dose) => dosagensItem.includes(dose));
}

export function buscarMedicamento(entrada, itens) {
  const entradaNormalizada = normalizarTexto(entrada);
  const candidatos = filtrarPorPrincipioAtivo(itens, entradaNormalizada);
  if (candidatos.length === 0) {
    return { situacao: SITUACAO.NAO_IDENTIFICADO, itens: [] };
  }

  const dosagensInformadas = extrairDosagens(entrada);
  if (dosagensInformadas.length === 0 && candidatos.length > 1) {
    return { situacao: SITUACAO.SEM_CONCENTRACAO_INFORMADA, itens: candidatos };
  }
  const compativeis = candidatos.filter((item) =>
    possuiDosagens(item, dosagensInformadas),
  );
  if (compativeis.length === 0) {
    return { situacao: SITUACAO.CONCENTRACAO_NAO_LISTADA, itens: candidatos };
  }
  if (compativeis.length > 1) {
    return { situacao: SITUACAO.AMBIGUO, itens: compativeis };
  }
  return { situacao: SITUACAO.IDENTIFICADO, itens: compativeis };
}

// Separa por quebra de linha ou ";" — vírgula não serve como separador
// porque aparece em concentrações como "0,25 mg".
export function separarEntradas(textoReceita) {
  return textoReceita
    .split(/[\n;]+/)
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0);
}
