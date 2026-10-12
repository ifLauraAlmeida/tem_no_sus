import { separarEntradas } from "./busca_medicamentos.js";
import { oferecerBuscaDeLocais } from "./busca_locais.js";
import { COBERTURA, consultarCobertura, unirGruposDeRetirada } from "./consulta_cobertura.js";
import { criarElemento, criarLink, formatarData } from "./elementos_dom.js";
import { paragrafoRequisitosRetirada, renderizarConsulta } from "./resultado_consulta.js";

const CAMINHOS_BASES = {
  farmaciaPopular: "data/reference/farmacia_popular_elenco.json",
  componenteBasico: "data/reference/rename_2024_componente_basico.json",
};
const EXEMPLO_RECEITA = "Losartana 50 mg\nMetformina\nDipirona 500 mg\nLosartan 50";

const elementos = {
  mensagens: document.getElementById("mensagens"),
  formulario: document.getElementById("formulario-consulta"),
  entrada: document.getElementById("entrada-medicamentos"),
  erroFormulario: document.getElementById("erro-formulario"),
  botaoConsultar: document.getElementById("botao-consultar"),
  botaoExemplo: document.getElementById("botao-exemplo"),
  dadosFonte: document.getElementById("dados-fonte"),
};

function adicionarMensagem(tipo, conteudo) {
  const mensagem = criarElemento("div", `mensagem mensagem--${tipo}`);
  const blocos = Array.isArray(conteudo) ? conteudo : [conteudo];
  blocos.forEach((bloco) => {
    mensagem.append(typeof bloco === "string" ? criarElemento("p", null, bloco) : bloco);
  });
  elementos.mensagens.append(mensagem);
  elementos.mensagens.scrollTop = elementos.mensagens.scrollHeight;
  return mensagem;
}

function renderizarFontes(bases) {
  elementos.dadosFonte.replaceChildren();
  Object.values(bases).forEach(({ fonte }) => {
    const descricao = criarElemento("dd");
    const atualizacao = fonte.data_atualizacao_fonte
      ? `atualizada em ${formatarData(fonte.data_atualizacao_fonte)}`
      : `obtida em ${formatarData(fonte.data_obtencao)}`;
    descricao.append(criarLink(fonte.url, fonte.documento), ` — ${fonte.orgao}, ${atualizacao}.`);
    elementos.dadosFonte.append(criarElemento("dt", null, fonte.programa), descricao);
  });
}

function consultarReceita(textoReceita, bases) {
  const entradas = separarEntradas(textoReceita);
  const consultas = entradas.map((entrada) => consultarCobertura(entrada, bases));
  const algumCoberto = consultas.some((consulta) => consulta.cobertura !== COBERTURA.NAO_COBERTO);
  const opcoesRenderizacao = {
    itensConhecidos: [...bases.farmaciaPopular.itens, ...bases.componenteBasico.itens],
    aoEscolherSugestao: (entradaCorrigida) => consultarReceita(entradaCorrigida, bases),
  };

  adicionarMensagem("usuario", entradas.join("\n"));
  adicionarMensagem("sistema", [
    "Resultado da consulta:",
    ...consultas.map((consulta) => renderizarConsulta(consulta, opcoesRenderizacao)),
    ...(algumCoberto ? [paragrafoRequisitosRetirada(bases.farmaciaPopular.fonte.url_legislacao)] : []),
  ]);

  if (!algumCoberto) {
    adicionarMensagem(
      "sistema",
      "Nenhum medicamento informado foi identificado como coberto. Confira os nomes na receita e tente novamente.",
    );
    return;
  }
  oferecerBuscaDeLocais(adicionarMensagem, unirGruposDeRetirada(consultas));
}

function mostrarErroFormulario(texto) {
  elementos.erroFormulario.textContent = texto;
  elementos.erroFormulario.hidden = !texto;
}

function habilitarFormulario(bases) {
  [elementos.entrada, elementos.botaoConsultar, elementos.botaoExemplo].forEach((campo) => {
    campo.disabled = false;
  });

  elementos.botaoExemplo.addEventListener("click", () => {
    elementos.entrada.value = EXEMPLO_RECEITA;
    elementos.entrada.focus();
  });

  elementos.formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const textoReceita = elementos.entrada.value;
    if (separarEntradas(textoReceita).length === 0) {
      mostrarErroFormulario("Digite ao menos um medicamento, um por linha.");
      return;
    }
    mostrarErroFormulario("");
    consultarReceita(textoReceita, bases);
    elementos.entrada.value = "";
  });
}

async function carregarJson(caminho) {
  const resposta = await fetch(caminho);
  if (!resposta.ok) throw new Error(`falha ao carregar ${caminho}: HTTP ${resposta.status}`);
  return resposta.json();
}

async function carregarBases() {
  const [farmaciaPopular, componenteBasico] = await Promise.all([
    carregarJson(CAMINHOS_BASES.farmaciaPopular),
    carregarJson(CAMINHOS_BASES.componenteBasico),
  ]);
  return { farmaciaPopular, componenteBasico };
}

async function iniciar() {
  const carregando = adicionarMensagem("sistema mensagem--carregando", "Carregando as listas de medicamentos…");
  try {
    const bases = await carregarBases();
    carregando.remove();
    renderizarFontes(bases);
    adicionarMensagem("sistema", [
      "Olá! Digite os medicamentos da sua receita, um por linha. A concentração ajuda (ex.: Losartana 50 mg), mas não é obrigatória.",
      "Consulto o elenco do Farmácia Popular e o Componente Básico da RENAME 2024. Depois, peço seu endereço para indicar locais próximos.",
    ]);
    habilitarFormulario(bases);
  } catch (erro) {
    console.error(erro);
    carregando.remove();
    adicionarMensagem(
      "sistema mensagem--erro",
      "Não foi possível carregar as listas de medicamentos. Recarregue a página; se o problema continuar, tente mais tarde.",
    );
    elementos.dadosFonte.replaceChildren(criarElemento("dd", null, "Indisponível no momento."));
  }
}

iniciar();
