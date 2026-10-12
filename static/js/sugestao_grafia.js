import { normalizarTexto } from "./normalizacao.js";

const LIMITE_SUGESTOES = 3;
const TAMANHO_MINIMO_PALAVRA = 4;

export function distanciaEdicao(origem, destino) {
  let linhaAnterior = Array.from({ length: destino.length + 1 }, (_, indice) => indice);
  for (let i = 1; i <= origem.length; i += 1) {
    const linhaAtual = [i];
    for (let j = 1; j <= destino.length; j += 1) {
      const custoTroca = origem[i - 1] === destino[j - 1] ? 0 : 1;
      linhaAtual[j] = Math.min(linhaAnterior[j] + 1, linhaAtual[j - 1] + 1, linhaAnterior[j - 1] + custoTroca);
    }
    linhaAnterior = linhaAtual;
  }
  return linhaAnterior[destino.length];
}

// Palavras curtas toleram menos erros para não sugerir nomes sem relação.
function toleranciaPara(palavra) {
  return palavra.length <= 6 ? 1 : 2;
}

function palavrasDaEntrada(entrada) {
  return normalizarTexto(entrada)
    .split(" ")
    .filter((palavra) => /^[a-z]+$/.test(palavra) && palavra.length >= TAMANHO_MINIMO_PALAVRA);
}

function termosSimples(itens) {
  const termos = itens.flatMap((item) => item.termos_busca).map(normalizarTexto);
  return [...new Set(termos.filter((termo) => !termo.includes(" ")))];
}

// Apenas sugere; a consulta só é refeita se o usuário escolher a sugestão.
export function sugerirGrafias(entrada, itens) {
  const candidatos = [];
  for (const palavra of palavrasDaEntrada(entrada)) {
    for (const termo of termosSimples(itens)) {
      const distancia = distanciaEdicao(palavra, termo);
      if (distancia > 0 && distancia <= toleranciaPara(palavra)) candidatos.push({ termo, distancia });
    }
  }
  candidatos.sort((a, b) => a.distancia - b.distancia || a.termo.localeCompare(b.termo));
  return [...new Set(candidatos.map((candidato) => candidato.termo))].slice(0, LIMITE_SUGESTOES);
}

export function aplicarSugestao(entrada, sugestao) {
  const dosagem = normalizarTexto(entrada).match(/\d.*$/);
  return dosagem ? `${sugestao} ${dosagem[0]}` : sugestao;
}
