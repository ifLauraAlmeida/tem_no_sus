import { criarElemento, criarLink, formatarData } from "./elementos_dom.js";
import {
  GRUPO_POR_FRENTE,
  grupoDoEstabelecimento,
  ordenarPorProximidade,
  selecionarComDiversidade,
} from "./selecao_estabelecimentos.js";

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

// Só lista municípios com locais compatíveis com o elenco, para não oferecer
// uma opção que sempre levaria a resultado vazio.
function listarMunicipios(estabelecimentos) {
  const compativeis = estabelecimentos.filter((e) => grupoDoEstabelecimento(e) !== null);
  const nomesPorCodigo = new Map(compativeis.map((e) => [e.codigo_municipio, e.municipio]));
  return [...nomesPorCodigo].sort(([, nomeA], [, nomeB]) => nomeA.localeCompare(nomeB, "pt-BR"));
}

function criarCampo(rotulo, controle, idControle) {
  const campo = criarElemento("div", "campo");
  const label = criarElemento("label", null, rotulo);
  label.htmlFor = idControle;
  controle.id = idControle;
  campo.append(label, controle);
  return campo;
}

function criarSelect(opcoes, textoVazio) {
  const select = criarElemento("select");
  const vazio = criarElemento("option", null, textoVazio);
  vazio.value = "";
  select.append(vazio, ...opcoes.map(([valor, texto]) => Object.assign(criarElemento("option", null, texto), { value: valor })));
  return select;
}

function descreverEndereco(estabelecimento) {
  const { logradouro, numero, bairro, cep } = estabelecimento.endereco;
  const rua = [logradouro, numero].filter(Boolean).join(", ");
  const cepFormatado = cep ? `CEP ${cep.slice(0, 5)}-${cep.slice(5)}` : null;
  return [rua, bairro, `${estabelecimento.municipio}`, cepFormatado].filter(Boolean).join(" · ");
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
  const titulo = criarElemento("p", "estabelecimento__nome", estabelecimento.nome);
  cartao.append(titulo, criarElemento("span", "estabelecimento__tipo", descricao.rotulo));
  cartao.append(criarElemento("p", null, descreverEndereco(estabelecimento)));
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

function mensagemResultadoLocais(selecionados) {
  if (selecionados.length === 0) {
    const vazio = criarElemento("p");
    vazio.append(
      "Não encontrei estabelecimentos compatíveis nesse município na base do CNES. Consulte o ",
      criarLink(URL_PAINEL_FARMACIA_POPULAR, "painel oficial de farmácias do Farmácia Popular"),
      ".",
    );
    return [vazio];
  }
  const rodape = criarElemento("p", "resultado__observacao");
  rodape.append(
    "A lista de drogarias do Farmácia Popular no CNES é parcial. Veja todas no ",
    criarLink(URL_PAINEL_FARMACIA_POPULAR, "painel oficial do programa"),
    ".",
  );
  const titulo = selecionados.length === 1 ? "Local para tentar a retirada:" : `${selecionados.length} locais para tentar a retirada:`;
  return [titulo, ...selecionados.map(renderizarEstabelecimento), rodape];
}

function solicitarPosicao() {
  return new Promise((resolver, rejeitar) => {
    if (!navigator.geolocation) {
      rejeitar(new Error("geolocalização indisponível no navegador"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolver({ latitude: coords.latitude, longitude: coords.longitude }),
      rejeitar,
      { timeout: 15000, maximumAge: 300000 },
    );
  });
}

function criarFormularioLocais(indice, sufixo, aoBuscar) {
  const formulario = criarElemento("form", "formulario-locais");
  const ufs = Object.keys(indice.ufs).map((uf) => [uf, uf]);
  const selectUf = criarSelect(ufs, "Selecione");
  const selectMunicipio = criarSelect([], "Selecione a UF primeiro");
  const campoBairro = Object.assign(criarElemento("input"), { type: "text", autocomplete: "address-level3" });
  const botaoPosicao = Object.assign(criarElemento("button", "botao botao--secundario", "Usar minha localização"), { type: "button" });
  const botaoBuscar = Object.assign(criarElemento("button", "botao botao--primario", "Buscar locais"), { type: "submit" });
  const situacao = criarElemento("p", "resultado__observacao");
  situacao.setAttribute("role", "status");
  let posicaoUsuario = null;

  selectMunicipio.disabled = true;
  selectUf.addEventListener("change", async () => {
    selectMunicipio.disabled = true;
    if (!selectUf.value) return;
    situacao.textContent = "Carregando municípios…";
    try {
      const base = await carregarBaseUf(selectUf.value);
      selectMunicipio.replaceWith(Object.assign(criarSelect(listarMunicipios(base.estabelecimentos), "Selecione"), { id: selectMunicipio.id }));
      situacao.textContent = "";
    } catch (erro) {
      console.error(erro);
      situacao.textContent = "Não foi possível carregar os municípios dessa UF. Tente novamente.";
    }
  });

  botaoPosicao.addEventListener("click", async () => {
    situacao.textContent = "Aguardando sua autorização no navegador…";
    try {
      posicaoUsuario = await solicitarPosicao();
      situacao.textContent = "Localização obtida. Os locais serão ordenados pela distância.";
    } catch {
      posicaoUsuario = null;
      situacao.textContent = "Localização não autorizada. A busca usará o município e o bairro.";
    }
  });

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const municipio = formulario.querySelector(`#municipio-${sufixo}`);
    if (!selectUf.value || !municipio.value) {
      situacao.textContent = "Selecione a UF e o município.";
      return;
    }
    aoBuscar({ uf: selectUf.value, municipio: municipio.value, bairro: campoBairro.value.trim(), posicaoUsuario });
  });

  const acoes = criarElemento("div", "conversa__acoes");
  acoes.append(botaoPosicao, botaoBuscar);
  formulario.append(
    criarCampo("Estado (UF)", selectUf, `uf-${sufixo}`),
    criarCampo("Município", selectMunicipio, `municipio-${sufixo}`),
    criarCampo("Bairro (opcional)", campoBairro, `bairro-${sufixo}`),
    acoes,
    situacao,
    criarElemento(
      "p",
      "resultado__observacao",
      "Sua localização é usada só neste navegador para calcular distâncias; não é enviada nem armazenada.",
    ),
  );
  return formulario;
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
  const formulario = criarFormularioLocais(indice, contadorFormularios, async (filtros) => {
    const base = await carregarBaseUf(filtros.uf);
    const selecionados = selecionarComDiversidade(ordenarPorProximidade(base.estabelecimentos, filtros));
    adicionarMensagem("sistema", mensagemResultadoLocais(selecionados));
  });
  const ufsDisponiveis = Object.keys(indice.ufs).join(", ");
  adicionarMensagem("sistema", [
    `Quer ver locais para tentar a retirada? Por enquanto há dados de: ${ufsDisponiveis}. ` +
      "Aparecem só os municípios com estabelecimentos compatíveis no CNES.",
    formulario,
  ]);
}
