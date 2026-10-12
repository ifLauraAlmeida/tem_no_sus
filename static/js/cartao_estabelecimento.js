import { criarElemento, criarLink, formatarData } from "./elementos_dom.js";
import { GRUPO_POR_FRENTE, REFERENCIA_PROXIMIDADE } from "./selecao_estabelecimentos.js";

const DESCRICAO_GRUPO = {
  [GRUPO_POR_FRENTE.CBAF]: {
    rotulo: "Rede pública · medicamentos básicos",
    aviso:
      "Na rede pública, a retirada costuma ser feita na unidade de referência do seu endereço, e algumas " +
      "unidades atendem só públicos específicos. Confirme com a unidade se ela atende você, a lista de " +
      "medicamentos do município e o estoque.",
  },
  [GRUPO_POR_FRENTE.FARMACIA_POPULAR]: {
    rotulo: "Farmácia Popular · credenciada",
    aviso: "Farmácia ativa na lista oficial do programa. Confirme o estoque com a farmácia antes de ir.",
  },
};

export function descreverEndereco(estabelecimento) {
  const { logradouro, numero, bairro, cep } = estabelecimento.endereco;
  const rua = [logradouro, numero].filter(Boolean).join(", ");
  const cepFormatado = cep ? `CEP ${cep.slice(0, 5)}-${cep.slice(5)}` : null;
  return [rua, bairro, estabelecimento.municipio, cepFormatado].filter(Boolean).join(" · ");
}

export function descreverProximidade(estabelecimento) {
  if (estabelecimento.referencia === REFERENCIA_PROXIMIDADE.KM) {
    const estimado = estabelecimento.precisao_localizacao === "centro_cep" ? " (local estimado pelo centro do CEP da farmácia)" : "";
    // Abaixo de 100 m o arredondamento daria "0 km".
    if (estabelecimento.distanciaKm < 0.1) return `Menos de 100 m em linha reta${estimado}.`;
    const distancia = estabelecimento.distanciaKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    return `Cerca de ${distancia} km em linha reta${estimado}.`;
  }
  const local = estabelecimento.referencia === REFERENCIA_PROXIMIDADE.BAIRRO ? "no seu bairro" : "no seu município";
  return `Fica ${local}; a fonte não informa a localização exata para calcular a distância.`;
}

export function descreverOrigem(estabelecimento) {
  if (estabelecimento.grupo === GRUPO_POR_FRENTE.FARMACIA_POPULAR) {
    return `Fonte: lista oficial de farmácias ativas do Farmácia Popular; CNPJ ${estabelecimento.cnpj}, credenciada em ${estabelecimento.data_credenciamento}.`;
  }
  const competencia = `${estabelecimento.competencia_cnes.slice(4)}/${estabelecimento.competencia_cnes.slice(0, 4)}`;
  const atualizacao = estabelecimento.cadastro_atualizado_em
    ? `; cadastro atualizado em ${formatarData(estabelecimento.cadastro_atualizado_em)}`
    : "";
  return `Fonte: CNES ${estabelecimento.cnes}, competência ${competencia}${atualizacao}.`;
}

// Usa nome e endereço (não as coordenadas) para o Google Maps achar o
// estabelecimento pelo nome e mostrar horários e avaliações junto da rota.
export function montarUrlRota(estabelecimento, uf) {
  const { logradouro, numero, bairro } = estabelecimento.endereco;
  const rua = [logradouro, numero].filter(Boolean).join(" ");
  const destino = [estabelecimento.nome, rua, bairro, `${estabelecimento.municipio} - ${uf}`].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`;
}

function criarBotaoRota(estabelecimento, uf) {
  const link = criarLink(montarUrlRota(estabelecimento, uf), "Como chegar (Google Maps)");
  link.className = "botao botao--secundario botao--rota";
  link.setAttribute("aria-label", `Como chegar em ${estabelecimento.nome} pelo Google Maps (abre em nova aba)`);
  return link;
}

export function renderizarEstabelecimento(estabelecimento, uf) {
  const descricao = DESCRICAO_GRUPO[estabelecimento.grupo];
  const cartao = criarElemento("div", `estabelecimento estabelecimento--${estabelecimento.grupo}`);
  cartao.append(criarElemento("p", "estabelecimento__nome", estabelecimento.nome));
  if (estabelecimento.razao_social && estabelecimento.razao_social !== estabelecimento.nome) {
    cartao.append(criarElemento("p", "resultado__observacao", `Razão social: ${estabelecimento.razao_social}`));
  }
  cartao.append(
    criarElemento("span", "estabelecimento__tipo", descricao.rotulo),
    criarElemento("p", null, descreverEndereco(estabelecimento)),
    criarElemento("p", null, descreverProximidade(estabelecimento)),
    criarElemento("p", "resultado__observacao", descricao.aviso),
    criarElemento("p", "resultado__observacao", descreverOrigem(estabelecimento)),
    criarBotaoRota(estabelecimento, uf),
  );
  return cartao;
}
