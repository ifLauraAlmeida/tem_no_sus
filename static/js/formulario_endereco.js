import { criarElemento } from "./elementos_dom.js";
import { NOME_POR_UF, completarPorCep, limparCep } from "./geocodificacao.js";

const CAMPOS_OBRIGATORIOS = Object.freeze({ uf: "estado", municipio: "município", bairro: "bairro", rua: "rua" });

function criarCampo(rotulo, controle, id) {
  const campo = criarElemento("div", "campo");
  const label = criarElemento("label", null, rotulo);
  label.htmlFor = id;
  controle.id = id;
  campo.append(label, controle);
  return campo;
}

function criarEntradaTexto(nome, autocomplete) {
  return Object.assign(criarElemento("input"), { type: "text", name: nome, autocomplete });
}

function criarSelectUf(ufsDisponiveis) {
  const select = Object.assign(criarElemento("select"), { name: "uf" });
  const vazio = Object.assign(criarElemento("option", null, "Selecione"), { value: "" });
  const opcoes = ufsDisponiveis.map((uf) =>
    Object.assign(criarElemento("option", null, `${NOME_POR_UF[uf] ?? uf} (${uf})`), { value: uf }),
  );
  select.append(vazio, ...opcoes);
  return select;
}

function lerEndereco(formulario) {
  const valor = (nome) => formulario.elements[nome].value.trim();
  return {
    cep: valor("cep"),
    uf: valor("uf"),
    municipio: valor("municipio"),
    bairro: valor("bairro"),
    rua: valor("rua"),
    numero: valor("numero"),
  };
}

export function camposFaltantes(endereco) {
  return Object.entries(CAMPOS_OBRIGATORIOS)
    .filter(([campo]) => !endereco[campo])
    .map(([, rotulo]) => rotulo);
}

async function preencherPeloCep(formulario, situacao) {
  if (!limparCep(formulario.elements.cep.value)) return;
  situacao.textContent = "Buscando endereço pelo CEP…";
  try {
    const completo = await completarPorCep(lerEndereco(formulario));
    ["uf", "municipio", "bairro", "rua"].forEach((campo) => {
      const controle = formulario.elements[campo];
      if (!controle.value && completo[campo]) controle.value = completo[campo];
    });
    situacao.textContent = "";
  } catch (erro) {
    console.error(erro);
    situacao.textContent = "Não consegui consultar o CEP agora; preencha o endereço manualmente.";
  }
}

function criarCampos(ufsDisponiveis, sufixo) {
  return [
    criarCampo("CEP (opcional, preenche o restante)", criarEntradaTexto("cep", "postal-code"), `cep-${sufixo}`),
    criarCampo("Estado", criarSelectUf(ufsDisponiveis), `uf-${sufixo}`),
    criarCampo("Município", criarEntradaTexto("municipio", "address-level2"), `municipio-${sufixo}`),
    criarCampo("Bairro", criarEntradaTexto("bairro", "address-level3"), `bairro-${sufixo}`),
    criarCampo("Rua", criarEntradaTexto("rua", "address-line1"), `rua-${sufixo}`),
    criarCampo("Número (opcional)", criarEntradaTexto("numero", "off"), `numero-${sufixo}`),
  ];
}

function criarAcoes() {
  const acoes = criarElemento("div", "conversa__acoes");
  const botaoLocalizacao = Object.assign(
    criarElemento("button", "botao botao--secundario", "Usar minha localização"),
    { type: "button" },
  );
  const botaoBuscar = Object.assign(criarElemento("button", "botao botao--primario", "Buscar locais"), { type: "submit" });
  acoes.append(botaoLocalizacao, botaoBuscar);
  return { acoes, botaoLocalizacao };
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

async function tratarUsoDaLocalizacao(formulario, situacao, aoUsarLocalizacao) {
  const uf = formulario.elements.uf.value;
  if (!uf) {
    situacao.textContent = "Selecione o estado antes de usar sua localização.";
    return;
  }
  situacao.textContent = "Aguardando sua autorização no navegador…";
  try {
    const posicao = await solicitarPosicaoNavegador();
    situacao.textContent = "";
    aoUsarLocalizacao({ uf, posicao });
  } catch {
    situacao.textContent = "Localização não autorizada. Preencha o endereço para continuar.";
  }
}

function tratarEnvio(formulario, situacao, aoEnviarEndereco) {
  const endereco = lerEndereco(formulario);
  const faltantes = camposFaltantes(endereco);
  if (faltantes.length > 0) {
    situacao.textContent = `Preencha: ${faltantes.join(", ")}.`;
    return;
  }
  situacao.textContent = "";
  aoEnviarEndereco(endereco);
}

export function criarFormularioEndereco({ ufsDisponiveis, sufixo, aoEnviarEndereco, aoUsarLocalizacao }) {
  const formulario = criarElemento("form", "formulario-locais");
  formulario.noValidate = true;
  const situacao = criarElemento("p", "resultado__observacao");
  situacao.setAttribute("role", "status");
  const { acoes, botaoLocalizacao } = criarAcoes();
  const privacidade = criarElemento(
    "p",
    "resultado__observacao",
    "O endereço é enviado ao ViaCEP e ao OpenStreetMap (Nominatim) só para obter coordenadas, e não é " +
      "armazenado por este projeto. A localização do navegador é usada apenas neste aparelho.",
  );
  formulario.append(...criarCampos(ufsDisponiveis, sufixo), acoes, situacao, privacidade);

  formulario.elements.cep.addEventListener("change", () => preencherPeloCep(formulario, situacao));
  botaoLocalizacao.addEventListener("click", () => tratarUsoDaLocalizacao(formulario, situacao, aoUsarLocalizacao));
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    tratarEnvio(formulario, situacao, aoEnviarEndereco);
  });
  return formulario;
}
