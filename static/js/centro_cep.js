// Centro geográfico do CEP, pré-calculado a partir do CNEFE (IBGE, Censo 2022).
// Um arquivo por prefixo de 3 dígitos, baixado só quando necessário.

const CAMINHO_CENTROS = "data/processed/cep";
const centrosPorPrefixo = new Map();

export const PRECISAO_CENTRO_CEP = "centro_cep";

async function carregarPrefixo(prefixo, buscar) {
  const resposta = await buscar(`${CAMINHO_CENTROS}/${prefixo}.json`);
  if (resposta.status === 404) return {};
  if (!resposta.ok) throw new Error(`falha ao carregar centros de CEP ${prefixo}: HTTP ${resposta.status}`);
  return resposta.json();
}

// Retorna null quando o CEP não consta no CNEFE (ex.: CEP criado depois de 2022).
export async function buscarCentroCep(cep, buscar = fetch) {
  const prefixo = cep.slice(0, 3);
  if (!centrosPorPrefixo.has(prefixo)) centrosPorPrefixo.set(prefixo, carregarPrefixo(prefixo, buscar));
  const centro = (await centrosPorPrefixo.get(prefixo))[cep];
  if (!centro) return null;
  const [latitude, longitude] = centro;
  return { latitude, longitude, precisao: PRECISAO_CENTRO_CEP };
}
