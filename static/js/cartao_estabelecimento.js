import { criarElemento, formatarData } from "./elementos_dom.js";
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
    const distancia = estabelecimento.distanciaKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    return `Cerca de ${distancia} km em linha reta.`;
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

export function renderizarEstabelecimento(estabelecimento) {
  const descricao = DESCRICAO_GRUPO[estabelecimento.grupo];
  const cartao = criarElemento("div", `estabelecimento estabelecimento--${estabelecimento.grupo}`);
  cartao.append(
    criarElemento("p", "estabelecimento__nome", estabelecimento.nome),
    criarElemento("span", "estabelecimento__tipo", descricao.rotulo),
    criarElemento("p", null, descreverEndereco(estabelecimento)),
    criarElemento("p", null, descreverProximidade(estabelecimento)),
    criarElemento("p", "resultado__observacao", descricao.aviso),
    criarElemento("p", "resultado__observacao", descreverOrigem(estabelecimento)),
  );
  return cartao;
}
