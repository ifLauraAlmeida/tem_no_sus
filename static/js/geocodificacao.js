// Converte endereço em coordenadas (e coordenadas em UF) usando o serviço
// público Nominatim/OpenStreetMap. O endereço não é armazenado por este projeto.

const URL_NOMINATIM = "https://nominatim.openstreetmap.org/search";
const URL_NOMINATIM_REVERSO = "https://nominatim.openstreetmap.org/reverse";

export const PRECISAO = Object.freeze({ ENDERECO: "endereco", MUNICIPIO: "municipio" });

export const NOME_POR_UF = Object.freeze({
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MG: "Minas Gerais",
  MS: "Mato Grosso do Sul", MT: "Mato Grosso", PA: "Pará", PB: "Paraíba", PE: "Pernambuco",
  PI: "Piauí", PR: "Paraná", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RO: "Rondônia",
  RR: "Roraima", RS: "Rio Grande do Sul", SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo",
  TO: "Tocantins",
});

export class GeocodificacaoIndisponivelError extends Error {}

async function buscarJson(url, buscar) {
  let resposta;
  try {
    resposta = await buscar(url, { headers: { Accept: "application/json" } });
  } catch (erro) {
    throw new GeocodificacaoIndisponivelError(`falha de rede ao consultar ${url}: ${erro.message}`);
  }
  if (!resposta.ok) throw new GeocodificacaoIndisponivelError(`${url} respondeu HTTP ${resposta.status}`);
  return resposta.json();
}

export function montarUrlNominatim(endereco, precisao) {
  const parametros = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    countrycodes: "br",
    city: endereco.municipio,
    state: NOME_POR_UF[endereco.uf] ?? endereco.uf,
  });
  if (precisao === PRECISAO.ENDERECO) {
    parametros.set("street", [endereco.numero, endereco.rua].filter(Boolean).join(" "));
  }
  return `${URL_NOMINATIM}?${parametros}`;
}

async function consultarNominatim(endereco, precisao, buscar) {
  const [lugar] = await buscarJson(montarUrlNominatim(endereco, precisao), buscar);
  if (!lugar) return null;
  return { latitude: Number(lugar.lat), longitude: Number(lugar.lon), precisao };
}

// Tenta primeiro a rua; se não achar, usa o centro do município e informa
// a precisão menor para a interface avisar o usuário.
export async function geocodificarEndereco(endereco, buscar = fetch) {
  if (endereco.rua) {
    const porEndereco = await consultarNominatim(endereco, PRECISAO.ENDERECO, buscar);
    if (porEndereco) return porEndereco;
  }
  return consultarNominatim(endereco, PRECISAO.MUNICIPIO, buscar);
}

// O Nominatim devolve o código ISO da subdivisão ("BR-TO"), que dá a UF.
export async function identificarUfPorPosicao({ latitude, longitude }, buscar = fetch) {
  const parametros = new URLSearchParams({ format: "jsonv2", lat: String(latitude), lon: String(longitude), zoom: "5" });
  const lugar = await buscarJson(`${URL_NOMINATIM_REVERSO}?${parametros}`, buscar);
  const codigo = lugar?.address?.["ISO3166-2-lvl4"] ?? "";
  const uf = codigo.startsWith("BR-") ? codigo.slice(3) : null;
  return uf && uf in NOME_POR_UF ? uf : null;
}
