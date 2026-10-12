import { buscarCepsPorEndereco, ConsultaCepIndisponivelError, formatarCep, limparCep } from "./consulta_cep.js";
import { criarElemento } from "./elementos_dom.js";
import { NOME_POR_UF } from "./geocodificacao.js";

const CAMPOS_OBRIGATORIOS_SEM_CEP = Object.freeze({ uf: "estado", municipio: "município", rua: "rua" });

function criarCampo(rotulo, controle, id) {
  const campo = criarElemento("div", "campo");
  const label = criarElemento("label", null, rotulo);
  label.htmlFor = id;
  controle.id = id;
  campo.append(label, controle);
  return campo;
}

function criarEntradaTexto(nome, autocomplete, extras = {}) {
  return Object.assign(criarElemento("input"), { type: "text", name: nome, autocomplete, ...extras });
}

function criarBotao(classe, texto, tipo = "button") {
  return Object.assign(criarElemento("button", `botao ${classe}`, texto), { type: tipo });
}

function criarSelectUf(ufs) {
  const select = Object.assign(criarElemento("select"), { name: "uf" });
  const opcoes = ufs.map((uf) => Object.assign(criarElemento("option", null, `${NOME_POR_UF[uf] ?? uf} (${uf})`), { value: uf }));
  select.append(Object.assign(criarElemento("option", null, "Selecione"), { value: "" }), ...opcoes);
  return select;
}

function criarSituacao() {
  const situacao = criarElemento("p", "resultado__observacao");
  situacao.setAttribute("role", "status");
  return situacao;
}

export function camposFaltantesSemCep(endereco) {
  return Object.entries(CAMPOS_OBRIGATORIOS_SEM_CEP)
    .filter(([campo]) => !endereco[campo])
    .map(([, rotulo]) => rotulo);
}

export function descreverCandidato(endereco) {
  const rua = endereco.complemento ? `${endereco.rua} (${endereco.complemento})` : endereco.rua;
  return `${formatarCep(endereco.cep)} — ${rua}, ${endereco.bairro}, ${endereco.municipio}/${endereco.uf}`;
}

function criarFormularioCep(sufixo) {
  const formulario = Object.assign(criarElemento("form", "formulario-locais"), { noValidate: true });
  const campoCep = criarEntradaTexto("cep", "postal-code", { inputMode: "numeric", placeholder: "00000-000" });
  const botaoLocalizacao = criarBotao("botao--secundario", "Usar minha localização");
  const botaoNaoSei = criarBotao("botao--link", "Não sei meu CEP");
  const acoes = criarElemento("div", "conversa__acoes");
  acoes.append(botaoLocalizacao, criarBotao("botao--primario", "Buscar locais", "submit"));
  const situacao = criarSituacao();
  formulario.append(criarCampo("CEP", campoCep, `cep-${sufixo}`), botaoNaoSei, acoes, situacao);
  return { formulario, campoCep, botaoLocalizacao, botaoNaoSei, situacao };
}

function criarFormularioSemCep(ufsDisponiveis, sufixo) {
  const formulario = Object.assign(criarElemento("form", "formulario-locais formulario-locais--sem-cep"), { noValidate: true, hidden: true });
  const candidatos = criarElemento("div", "candidatos-cep");
  const situacao = criarSituacao();
  formulario.append(
    criarElemento("p", null, "Informe seu endereço para descobrir o CEP:"),
    criarCampo("Estado", criarSelectUf(ufsDisponiveis), `uf-${sufixo}`),
    criarCampo("Município", criarEntradaTexto("municipio", "address-level2"), `municipio-${sufixo}`),
    criarCampo("Rua (sem abreviações)", criarEntradaTexto("rua", "address-line1"), `rua-${sufixo}`),
    criarCampo("Número", criarEntradaTexto("numero", "off", { inputMode: "numeric" }), `numero-${sufixo}`),
    criarBotao("botao--primario", "Descobrir CEP", "submit"),
    situacao,
    candidatos,
  );
  return { formulario, candidatos, situacao };
}

function lerEnderecoSemCep(formulario) {
  const valor = (nome) => formulario.elements[nome].value.trim();
  return { uf: valor("uf"), municipio: valor("municipio"), rua: valor("rua"), numero: valor("numero") };
}

function renderizarCandidatos(enderecos, candidatos, aoEscolherCep) {
  candidatos.replaceChildren();
  if (enderecos.length === 0) return;
  candidatos.append(criarElemento("p", null, enderecos.length === 1 ? "Seu CEP é:" : "Escolha o CEP do seu endereço:"));
  enderecos.forEach((endereco) => {
    const botao = criarBotao("botao--sugestao botao--candidato", descreverCandidato(endereco));
    botao.addEventListener("click", () => aoEscolherCep(endereco.cep));
    candidatos.append(botao);
  });
}

async function descobrirCep(formularioSemCep, aoEscolherCep) {
  const { formulario, candidatos, situacao } = formularioSemCep;
  const endereco = lerEnderecoSemCep(formulario);
  const faltantes = camposFaltantesSemCep(endereco);
  if (faltantes.length > 0) {
    situacao.textContent = `Preencha: ${faltantes.join(", ")}.`;
    return;
  }
  situacao.textContent = "Procurando o CEP…";
  try {
    const enderecos = await buscarCepsPorEndereco(endereco);
    situacao.textContent = enderecos.length
      ? ""
      : "Não encontrei CEP para esse endereço. Confira o nome da rua, sem abreviações, e o município.";
    renderizarCandidatos(enderecos, candidatos, aoEscolherCep);
  } catch (erro) {
    if (!(erro instanceof ConsultaCepIndisponivelError)) throw erro;
    console.error(erro);
    situacao.textContent = "O serviço de CEP não respondeu. Tente novamente em instantes.";
  }
}

function solicitarPosicaoNavegador() {
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

async function tratarUsoDaLocalizacao(situacao, aoUsarLocalizacao) {
  situacao.textContent = "Aguardando sua autorização no navegador…";
  try {
    const posicao = await solicitarPosicaoNavegador();
    situacao.textContent = "";
    aoUsarLocalizacao(posicao);
  } catch {
    situacao.textContent = "Localização não autorizada. Informe o CEP para continuar.";
  }
}

function enviarCep(formularioCep, aoEnviarCep) {
  const cep = limparCep(formularioCep.campoCep.value);
  if (!cep) {
    formularioCep.situacao.textContent = "Digite um CEP com 8 números ou use “Não sei meu CEP”.";
    return;
  }
  formularioCep.situacao.textContent = "";
  aoEnviarCep(cep);
}

function criarAvisoPrivacidade() {
  return criarElemento(
    "p",
    "resultado__observacao",
    "O CEP é enviado ao ViaCEP para obter o endereço. Sua localização é estimada neste aparelho pelo centro do " +
      "CEP, com dados do IBGE; só se o CEP não constar nesses dados o endereço é enviado ao OpenStreetMap. " +
      "Nada é armazenado por este projeto.",
  );
}

export function criarFormularioEndereco({ ufsDisponiveis, sufixo, aoEnviarCep, aoUsarLocalizacao }) {
  const formularioCep = criarFormularioCep(sufixo);
  const formularioSemCep = criarFormularioSemCep(ufsDisponiveis, `${sufixo}-sem-cep`);
  const escolherCep = (cep) => {
    formularioCep.campoCep.value = formatarCep(cep);
    formularioSemCep.formulario.hidden = true;
    enviarCep(formularioCep, aoEnviarCep);
  };

  formularioCep.formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    enviarCep(formularioCep, aoEnviarCep);
  });
  formularioCep.botaoLocalizacao.addEventListener("click", () =>
    tratarUsoDaLocalizacao(formularioCep.situacao, aoUsarLocalizacao),
  );
  formularioCep.botaoNaoSei.addEventListener("click", () => {
    formularioSemCep.formulario.hidden = !formularioSemCep.formulario.hidden;
    if (!formularioSemCep.formulario.hidden) formularioSemCep.formulario.elements.uf.focus();
  });
  formularioSemCep.formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    descobrirCep(formularioSemCep, escolherCep);
  });

  const conteiner = criarElemento("div", "endereco");
  conteiner.append(formularioCep.formulario, formularioSemCep.formulario, criarAvisoPrivacidade());
  return conteiner;
}
