import { renderizarEstabelecimento } from "./cartao_estabelecimento.js";
import { buscarCentroCep } from "./centro_cep.js";
import { mensagemOQueLevar } from "./orientacoes_retirada.js";
import { ROLAGEM } from "./rolagem.js";
import { criarElemento, criarLink } from "./elementos_dom.js";
import { buscarEnderecoPorCep, ConsultaCepIndisponivelError, formatarCep } from "./consulta_cep.js";
import { criarFormularioEndereco } from "./formulario_endereco.js";
import {
  GeocodificacaoIndisponivelError,
  PRECISAO,
  geocodificarEndereco,
  identificarUfPorPosicao,
} from "./geocodificacao.js";
import { ordenarPorProximidade, selecionarComDiversidade } from "./selecao_estabelecimentos.js";

const CAMINHO_ESTABELECIMENTOS = "data/processed/estabelecimentos";
const CAMINHO_FARMACIA_POPULAR = "data/processed/farmacia_popular";
const URL_PAINEL_FARMACIA_POPULAR =
  "https://infoms.saude.gov.br/extensions/SEIDIGI_DEMAS_PFPB_ENDERECOS/index.html";

const basesPorUf = new Map();

async function buscarJson(caminho) {
  const resposta = await fetch(caminho);
  if (!resposta.ok) throw new Error(`falha ao carregar ${caminho}: HTTP ${resposta.status}`);
  return resposta.json();
}

async function buscarFarmaciasPopularesUf(uf, ufsComFarmacias) {
  if (!ufsComFarmacias.includes(uf)) return [];
  const base = await buscarJson(`${CAMINHO_FARMACIA_POPULAR}/${uf}.json`);
  return base.estabelecimentos;
}

// Une a rede pública (CNES) e as farmácias credenciadas (lista oficial do programa).
function carregarLocaisUf(uf, ufsComFarmacias) {
  if (!basesPorUf.has(uf)) {
    const locais = Promise.all([
      buscarJson(`${CAMINHO_ESTABELECIMENTOS}/${uf}.json`),
      buscarFarmaciasPopularesUf(uf, ufsComFarmacias),
    ]).then(([redePublica, farmacias]) => [...redePublica.estabelecimentos, ...farmacias]);
    basesPorUf.set(uf, locais);
  }
  return basesPorUf.get(uf);
}

function linkPainelOficial(prefixo) {
  const paragrafo = criarElemento("p", "resultado__observacao");
  paragrafo.append(prefixo, criarLink(URL_PAINEL_FARMACIA_POPULAR, "painel oficial do Farmácia Popular"), ".");
  return paragrafo;
}

function mensagemResultadoLocais(selecionados, observacoes, uf) {
  if (selecionados.length === 0) {
    return [
      "Não encontrei locais compatíveis perto desse endereço nas bases consultadas.",
      linkPainelOficial("Consulte as farmácias credenciadas no "),
    ];
  }
  const titulo =
    selecionados.length === 1 ? "Local mais próximo para tentar a retirada:" : `${selecionados.length} locais próximos para tentar a retirada:`;
  return [
    titulo,
    ...observacoes,
    ...selecionados.map((estabelecimento) => renderizarEstabelecimento(estabelecimento, uf)),
    linkPainelOficial("Veja todas as farmácias credenciadas no "),
  ];
}

function observacaoCentroCep(cep) {
  return `Sua localização foi estimada pelo centro do CEP ${formatarCep(cep)} (IBGE, Censo 2022); as distâncias são aproximadas.`;
}

// Prioriza o centro do CEP (arquivo local, sem enviar o CEP a terceiros);
// o mapa do OpenStreetMap só é usado para CEP que não consta no CNEFE.
async function localizarEndereco(endereco) {
  const centro = await buscarCentroCep(endereco.cep);
  if (centro) return { posicao: centro, observacao: observacaoCentroCep(endereco.cep) };
  try {
    const posicao = await geocodificarEndereco(endereco);
    if (!posicao) return { posicao: null, observacao: "Não localizei o CEP no mapa; usei o município e o bairro do CEP." };
    const observacao =
      posicao.precisao === PRECISAO.MUNICIPIO
        ? "Não localizei a rua do CEP no mapa; as distâncias são aproximadas, a partir do centro do município."
        : "Localização estimada pela rua do CEP no OpenStreetMap; as distâncias são aproximadas.";
    return { posicao, observacao };
  } catch (erro) {
    if (!(erro instanceof GeocodificacaoIndisponivelError)) throw erro;
    console.error(erro);
    return { posicao: null, observacao: "O serviço de mapas não respondeu; usei o município e o bairro do CEP." };
  }
}

// Mostra os locais e, em seguida, o que levar para os tipos de local exibidos.
function exibirLocais(selecionados, observacoes, uf, adicionarMensagem) {
  adicionarMensagem("sistema", mensagemResultadoLocais(selecionados, observacoes, uf));
  if (selecionados.length === 0) return;
  const gruposExibidos = new Set(selecionados.map((estabelecimento) => estabelecimento.grupo));
  adicionarMensagem("sistema", mensagemOQueLevar(gruposExibidos), ROLAGEM.NENHUMA);
}

function selecionarLocais(locais, filtros) {
  return selecionarComDiversidade(ordenarPorProximidade(locais, filtros));
}

function descreverEnderecoDoCep(endereco) {
  const partes = [endereco.rua, endereco.bairro, `${endereco.municipio}/${endereco.uf}`].filter(Boolean);
  return `CEP ${formatarCep(endereco.cep)} — ${partes.join(", ")}`;
}

async function obterEnderecoDoCep(cep, adicionarMensagem) {
  try {
    const endereco = await buscarEnderecoPorCep(cep);
    if (!endereco) {
      adicionarMensagem("usuario", `CEP ${formatarCep(cep)}`);
      adicionarMensagem("sistema", "Não encontrei esse CEP. Confira os números ou use \u201cNão sei meu CEP\u201d.");
    }
    return endereco;
  } catch (erro) {
    if (!(erro instanceof ConsultaCepIndisponivelError)) throw erro;
    console.error(erro);
    adicionarMensagem("sistema mensagem--erro", "O serviço de CEP não respondeu. Tente novamente em instantes.");
    return null;
  }
}

async function buscarPorCep(cep, contexto) {
  const { ufsDisponiveis, ufsComFarmacias, gruposPermitidos, adicionarMensagem } = contexto;
  const endereco = await obterEnderecoDoCep(cep, adicionarMensagem);
  if (!endereco) return;
  adicionarMensagem("usuario", descreverEnderecoDoCep(endereco));
  if (!ufsDisponiveis.includes(endereco.uf)) {
    adicionarMensagem("sistema", `Ainda não há base de locais para ${endereco.uf}.`);
    return;
  }
  const carregando = adicionarMensagem("sistema mensagem--carregando", "Localizando o endereço…");
  try {
    const [locais, { posicao, observacao }] = await Promise.all([
      carregarLocaisUf(endereco.uf, ufsComFarmacias),
      localizarEndereco(endereco),
    ]);
    const filtros = { posicaoUsuario: posicao, codigoMunicipio: endereco.codigoMunicipio, bairro: endereco.bairro, gruposPermitidos };
    const selecionados = selecionarLocais(locais, filtros);
    exibirLocais(selecionados, observacao ? [observacao] : [], endereco.uf, adicionarMensagem);
  } catch (erro) {
    console.error(erro);
    adicionarMensagem("sistema mensagem--erro", "Não foi possível buscar os locais agora. Tente novamente.");
  } finally {
    carregando.remove();
  }
}

async function buscarPorPosicao(posicao, contexto) {
  const { ufsDisponiveis, ufsComFarmacias, gruposPermitidos, adicionarMensagem } = contexto;
  adicionarMensagem("usuario", "Usar minha localização");
  try {
    const uf = await identificarUfPorPosicao(posicao);
    if (!uf || !ufsDisponiveis.includes(uf)) {
      adicionarMensagem("sistema", "Não consegui identificar seu estado pela localização. Informe o CEP.");
      return;
    }
    const locais = await carregarLocaisUf(uf, ufsComFarmacias);
    exibirLocais(selecionarLocais(locais, { posicaoUsuario: posicao, gruposPermitidos }), [], uf, adicionarMensagem);
  } catch (erro) {
    console.error(erro);
    adicionarMensagem("sistema mensagem--erro", "Não foi possível buscar os locais agora. Tente novamente.");
  }
}

let contadorFormularios = 0;

export async function oferecerBuscaDeLocais(adicionarMensagem, gruposPermitidos) {
  let indice;
  let indiceFarmacias;
  try {
    [indice, indiceFarmacias] = await Promise.all([
      buscarJson(`${CAMINHO_ESTABELECIMENTOS}/indice.json`),
      buscarJson(`${CAMINHO_FARMACIA_POPULAR}/indice.json`),
    ]);
  } catch (erro) {
    console.error(erro);
    adicionarMensagem("sistema mensagem--erro", "A busca de locais está indisponível no momento.");
    return;
  }
  contadorFormularios += 1;
  const contexto = {
    ufsDisponiveis: Object.keys(indice.ufs),
    ufsComFarmacias: Object.keys(indiceFarmacias.ufs),
    gruposPermitidos,
    adicionarMensagem,
  };
  const formulario = criarFormularioEndereco({
    ufsDisponiveis: contexto.ufsDisponiveis,
    sufixo: contadorFormularios,
    aoEnviarCep: (cep) => buscarPorCep(cep, contexto),
    aoUsarLocalizacao: (posicao) => buscarPorPosicao(posicao, contexto),
  });
  adicionarMensagem("sistema", [
    "Qual é o seu CEP? Com ele indico até 4 locais próximos onde você pode tentar retirar o medicamento.",
    formulario,
  ], ROLAGEM.NENHUMA);
  // Leva o cursor ao CEP sem rolar, para a pessoa continuar lendo a resposta
  // do início e digitar o CEP sem precisar clicar.
  formulario.querySelector('input[name="cep"]').focus({ preventScroll: true });
}
