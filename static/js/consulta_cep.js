// Consultas ao ViaCEP: endereço a partir do CEP e CEP a partir do endereço.

const URL_VIACEP = "https://viacep.com.br/ws";
const LIMITE_CANDIDATOS = 5;
const TAMANHO_MINIMO_BUSCA = 3;

export class ConsultaCepIndisponivelError extends Error {}

export function limparCep(cep) {
  const digitos = (cep ?? "").replace(/\D/g, "");
  return digitos.length === 8 ? digitos : null;
}

export function formatarCep(cep) {
  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}

async function buscarJson(url, buscar) {
  let resposta;
  try {
    resposta = await buscar(url);
  } catch (erro) {
    throw new ConsultaCepIndisponivelError(`falha de rede ao consultar ${url}: ${erro.message}`);
  }
  if (resposta.status === 400) return null;
  if (!resposta.ok) throw new ConsultaCepIndisponivelError(`${url} respondeu HTTP ${resposta.status}`);
  return resposta.json();
}

function converterEndereco(dadosViaCep) {
  return {
    cep: limparCep(dadosViaCep.cep),
    rua: dadosViaCep.logradouro || "",
    complemento: dadosViaCep.complemento || "",
    bairro: dadosViaCep.bairro || "",
    municipio: dadosViaCep.localidade,
    uf: dadosViaCep.uf,
  };
}

// Retorna null quando o CEP não existe; lança erro quando o serviço falha.
export async function buscarEnderecoPorCep(cep, buscar = fetch) {
  const cepLimpo = limparCep(cep);
  if (!cepLimpo) throw new RangeError(`cep inválido: ${JSON.stringify(cep)}; esperado 8 dígitos`);
  const dados = await buscarJson(`${URL_VIACEP}/${cepLimpo}/json/`, buscar);
  if (!dados || dados.erro) return null;
  return converterEndereco(dados);
}

// Interpreta o complemento do ViaCEP, que indica a faixa de números do CEP:
// "até 0223 - lado ímpar", "de 0684 a 0986 - lado par", "de 1001 ao fim",
// ou um número único quando o CEP pertence a um prédio ("2064").
export function interpretarComplemento(complemento) {
  const texto = (complemento ?? "").toLowerCase();
  const paridade = texto.includes("lado ímpar") ? "impar" : texto.includes("lado par") ? "par" : null;
  const numero = (padrao) => Number(texto.match(padrao)?.[1]);
  if (/^até \d+/.test(texto)) return { tipo: "faixa", minimo: 0, maximo: numero(/^até (\d+)(?:\/(\d+))?/), paridade };
  if (/^de \d+.* ao fim/.test(texto)) return { tipo: "faixa", minimo: numero(/^de (\d+)/), maximo: Infinity, paridade };
  if (/^de \d+.* a \d+/.test(texto)) {
    const [, minimo, maximo] = texto.match(/^de (\d+)(?:\/\d+)? a (\d+)/);
    return { tipo: "faixa", minimo: Number(minimo), maximo: Number(maximo), paridade };
  }
  if (/^\d+/.test(texto)) return { tipo: "numero", numero: numero(/^(\d+)/) };
  return { tipo: "livre" };
}

const PONTUACAO = Object.freeze({ INCOMPATIVEL: 0, LIVRE: 1, FAIXA: 2, NUMERO_EXATO: 3 });

export function pontuarCompatibilidade(complemento, numeroImovel) {
  const regra = interpretarComplemento(complemento);
  if (regra.tipo === "livre") return PONTUACAO.LIVRE;
  if (!numeroImovel) return regra.tipo === "numero" ? PONTUACAO.INCOMPATIVEL : PONTUACAO.FAIXA;
  if (regra.tipo === "numero") return regra.numero === numeroImovel ? PONTUACAO.NUMERO_EXATO : PONTUACAO.INCOMPATIVEL;
  const paridadeImovel = numeroImovel % 2 === 0 ? "par" : "impar";
  if (regra.paridade && regra.paridade !== paridadeImovel) return PONTUACAO.INCOMPATIVEL;
  const dentroDaFaixa = numeroImovel >= regra.minimo && numeroImovel <= regra.maximo;
  return dentroDaFaixa ? PONTUACAO.FAIXA : PONTUACAO.INCOMPATIVEL;
}

export function ordenarCandidatosPorNumero(enderecos, numeroDigitado) {
  const numeroImovel = Number.parseInt(numeroDigitado, 10) || null;
  return enderecos
    .map((endereco) => ({ endereco, pontuacao: pontuarCompatibilidade(endereco.complemento, numeroImovel) }))
    .filter(({ pontuacao }) => pontuacao > PONTUACAO.INCOMPATIVEL)
    .sort((a, b) => b.pontuacao - a.pontuacao)
    .slice(0, LIMITE_CANDIDATOS)
    .map(({ endereco }) => endereco);
}

export async function buscarCepsPorEndereco({ uf, municipio, rua, numero }, buscar = fetch) {
  if (municipio.length < TAMANHO_MINIMO_BUSCA || rua.length < TAMANHO_MINIMO_BUSCA) return [];
  const url = `${URL_VIACEP}/${uf}/${encodeURIComponent(municipio)}/${encodeURIComponent(rua)}/json/`;
  const dados = await buscarJson(url, buscar);
  if (!Array.isArray(dados)) return [];
  return ordenarCandidatosPorNumero(dados.map(converterEndereco), numero);
}
