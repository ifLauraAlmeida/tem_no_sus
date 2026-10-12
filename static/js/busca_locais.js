import { criarElemento, criarLink, formatarData } from "./elementos_dom.js";
import { criarFormularioEndereco } from "./formulario_endereco.js";
import { GeocodificacaoIndisponivelError, PRECISAO, geocodificarEndereco } from "./geocodificacao.js";
import { normalizarTexto } from "./normalizacao.js";
import { GRUPO_POR_FRENTE, ordenarPorProximidade, selecionarComDiversidade } from "./selecao_estabelecimentos.js";

const CAMINHO_ESTABELECIMENTOS = "data/processed/estabelecimentos";
const URL_PAINEL_FARMACIA_POPULAR =
  "https://infoms.saude.gov.br/extensions/SEIDIGI_DEMAS_PFPB_ENDERECOS/index.html";

const DESCRICAO_GRUPO = {
  [GRUPO_POR_FRENTE.CBAF]: {
    rotulo: "Rede pública · medicamentos básicos",
    aviso: "A lista de medicamentos do município e o estoque devem ser confirmados com a unidade.",
  },
  [GRUPO_POR_FRENTE.FARMACIA_POPULAR_CNES]: {
    rotulo: "Farmácia Popular · segundo o CNES",
    aviso: "Confirme o credenciamento atual no painel oficial do programa e o estoque com a farmácia.",
  },
};

const basesPorUf = new Map();

async function buscarJson(caminho) {
  const resposta = await fetch(caminho);
  if (!resposta.ok) throw new Error(`falha ao carregar ${caminho}: HTTP ${resposta.status}`);
  return resposta.json();
}

function carregarBaseUf(uf) {
  if (!basesPorUf.has(uf)) basesPorUf.set(uf, buscarJson(`${CAMINHO_ESTABELECIMENTOS}/${uf}.json`));
  return basesPorUf.get(uf);
}

function descreverEndereco(estabelecimento) {
  const { logradouro, numero, bairro, cep } = estabelecimento.endereco;
  const rua = [logradouro, numero].filter(Boolean).join(", ");
  const cepFormatado = cep ? `CEP ${cep.slice(0, 5)}-${cep.slice(5)}` : null;
  return [rua, bairro, estabelecimento.municipio, cepFormatado].filter(Boolean).join(" · ");
}

function descreverOrigem(estabelecimento) {
  const competencia = `${estabelecimento.competencia_cnes.slice(4)}/${estabelecimento.competencia_cnes.slice(0, 4)}`;
  const atualizacao = estabelecimento.cadastro_atualizado_em
    ? `; cadastro atualizado em ${formatarData(estabelecimento.cadastro_atualizado_em)}`
    : "";
  return `Fonte: CNES ${estabelecimento.cnes}, competência ${competencia}${atualizacao}.`;
}

function renderizarEstabelecimento(estabelecimento) {
  const descricao = DESCRICAO_GRUPO[estabelecimento.grupo];
  const cartao = criarElemento("div", `estabelecimento estabelecimento--${estabelecimento.grupo}`);
  cartao.append(
    criarElemento("p", "estabelecimento__nome", estabelecimento.nome),
    criarElemento("span", "estabelecimento__tipo", descricao.rotulo),
    criarElemento("p", null, descreverEndereco(estabelecimento)),
  );
  if (estabelecimento.distanciaKm != null) {
    const distancia = estabelecimento.distanciaKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    cartao.append(criarElemento("p", null, `Cerca de ${distancia} km em linha reta.`));
  }
  cartao.append(
    criarElemento("p", "resultado__observacao", descricao.aviso),
    criarElemento("p", "resultado__observacao", descreverOrigem(estabelecimento)),
  );
  return cartao;
}

function linkPainelOficial(prefixo) {
  const paragrafo = criarElemento("p", "resultado__observacao");
  paragrafo.append(prefixo, criarLink(URL_PAINEL_FARMACIA_POPULAR, "painel oficial do Farmácia Popular"), ".");
  return paragrafo;
}

function mensagemResultadoLocais(selecionados, observacoes) {
  if (selecionados.length === 0) {
    return [
      "Não encontrei estabelecimentos compatíveis perto desse endereço na base do CNES.",
      linkPainelOficial("Consulte as farmácias credenciadas no "),
    ];
  }
  const titulo =
    selecionados.length === 1 ? "Local mais próximo para tentar a retirada:" : `${selecionados.length} locais próximos para tentar a retirada:`;
  return [
    titulo,
    ...observacoes,
    ...selecionados.map(renderizarEstabelecimento),
    linkPainelOficial("A lista de drogarias do programa no CNES é parcial. Veja todas no "),
  ];
}

function codigoDoMunicipio(estabelecimentos, nomeMunicipio) {
  const nomeNormalizado = normalizarTexto(nomeMunicipio);
  const encontrado = estabelecimentos.find((e) => normalizarTexto(e.municipio) === nomeNormalizado);
  return encontrado?.codigo_municipio ?? null;
}

async function localizarEndereco(endereco) {
  try {
    const posicao = await geocodificarEndereco(endereco);
    if (!posicao) return { posicao: null, observacao: "Não localizei o endereço no mapa; usei o município e o bairro." };
    const observacao =
      posicao.precisao === PRECISAO.MUNICIPIO
        ? "Não localizei a rua; as distâncias são aproximadas, a partir do centro do município."
        : null;
    return { posicao, observacao };
  } catch (erro) {
    if (!(erro instanceof GeocodificacaoIndisponivelError)) throw erro;
    console.error(erro);
    return { posicao: null, observacao: "O serviço de mapas não respondeu; usei o município e o bairro." };
  }
}

// Sem coordenadas, restringe ao município digitado; se ele não tem locais
// na base, o resultado é vazio em vez de listar outro município qualquer.
function selecionarSemCoordenadas(base, endereco) {
  const municipio = codigoDoMunicipio(base.estabelecimentos, endereco.municipio);
  if (!municipio) return [];
  return selecionarComDiversidade(ordenarPorProximidade(base.estabelecimentos, { municipio, bairro: endereco.bairro }));
}

async function buscarPorEndereco(endereco, adicionarMensagem) {
  const descricao = [endereco.rua, endereco.numero].filter(Boolean).join(", ");
  adicionarMensagem("usuario", `${descricao} — ${endereco.bairro}, ${endereco.municipio}/${endereco.uf}`);
  const carregando = adicionarMensagem("sistema mensagem--carregando", "Localizando o endereço…");
  try {
    const [base, { posicao, observacao }] = await Promise.all([carregarBaseUf(endereco.uf), localizarEndereco(endereco)]);
    const selecionados = posicao
      ? selecionarComDiversidade(ordenarPorProximidade(base.estabelecimentos, { posicaoUsuario: posicao }))
      : selecionarSemCoordenadas(base, endereco);
    adicionarMensagem("sistema", mensagemResultadoLocais(selecionados, observacao ? [observacao] : []));
  } catch (erro) {
    console.error(erro);
    adicionarMensagem("sistema mensagem--erro", "Não foi possível buscar os locais agora. Tente novamente.");
  } finally {
    carregando.remove();
  }
}

async function buscarPorPosicao({ uf, posicao }, adicionarMensagem) {
  adicionarMensagem("usuario", "Usar minha localização");
  try {
    const base = await carregarBaseUf(uf);
    const selecionados = selecionarComDiversidade(ordenarPorProximidade(base.estabelecimentos, { posicaoUsuario: posicao }));
    adicionarMensagem("sistema", mensagemResultadoLocais(selecionados, []));
  } catch (erro) {
    console.error(erro);
    adicionarMensagem("sistema mensagem--erro", "Não foi possível buscar os locais agora. Tente novamente.");
  }
}

let contadorFormularios = 0;

export async function oferecerBuscaDeLocais(adicionarMensagem) {
  let indice;
  try {
    indice = await buscarJson(`${CAMINHO_ESTABELECIMENTOS}/indice.json`);
  } catch (erro) {
    console.error(erro);
    adicionarMensagem("sistema mensagem--erro", "A busca de locais está indisponível no momento.");
    return;
  }
  contadorFormularios += 1;
  const formulario = criarFormularioEndereco({
    ufsDisponiveis: Object.keys(indice.ufs),
    sufixo: contadorFormularios,
    aoEnviarEndereco: (endereco) => buscarPorEndereco(endereco, adicionarMensagem),
    aoUsarLocalizacao: (dados) => buscarPorPosicao(dados, adicionarMensagem),
  });
  adicionarMensagem("sistema", [
    "Qual é o seu endereço? Com ele indico até 4 locais próximos onde você pode tentar retirar o medicamento.",
    formulario,
  ]);
}
