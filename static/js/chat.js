import { buscarMedicamento, separarEntradas, SITUACAO } from "./busca_medicamentos.js";
import { criarElemento, criarLink, formatarData } from "./elementos_dom.js";
import { oferecerBuscaDeLocais } from "./busca_locais.js";
import { aplicarSugestao, sugerirGrafias } from "./sugestao_grafia.js";

const CAMINHO_ELENCO = "data/reference/farmacia_popular_elenco.json";
const EXEMPLO_RECEITA = "Losartana 50 mg\nMetformina 500 mg\nDipirona 500 mg";

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

function renderizarFonte(fonte) {
  const campos = [
    ["Fonte", criarLink(fonte.url, `${fonte.documento} — ${fonte.programa}`)],
    ["Órgão", fonte.orgao],
    ["Atualizada pela fonte em", formatarData(fonte.data_atualizacao_fonte)],
    ["Obtida por este projeto em", formatarData(fonte.data_obtencao)],
  ];
  elementos.dadosFonte.replaceChildren();
  campos.forEach(([rotulo, valor]) => {
    const descricao = criarElemento("dd");
    descricao.append(valor);
    elementos.dadosFonte.append(criarElemento("dt", null, rotulo), descricao);
  });
}

function listarItens(itens) {
  const lista = criarElemento("ul");
  itens.forEach((item) => {
    lista.append(criarElemento("li", null, `${item.descricao_original} — ${item.indicacao}`));
  });
  return lista;
}

const TEXTOS_SITUACAO = {
  [SITUACAO.IDENTIFICADO]: {
    rotulo: "consta no elenco",
    explicacao: "Previsto para distribuição gratuita nas farmácias credenciadas ao Farmácia Popular:",
  },
  [SITUACAO.SEM_CONCENTRACAO_INFORMADA]: {
    rotulo: "consta no elenco",
    explicacao: "Sim, consta no elenco do Farmácia Popular, com distribuição gratuita. Concentrações disponíveis:",
  },
  [SITUACAO.AMBIGUO]: {
    rotulo: "confirme a apresentação",
    explicacao: "Há mais de uma apresentação no elenco. Confira na receita qual corresponde à sua:",
  },
  [SITUACAO.CONCENTRACAO_NAO_LISTADA]: {
    rotulo: "concentração não listada",
    explicacao: "O princípio ativo consta no elenco, mas não na concentração informada. Concentrações listadas:",
  },
  [SITUACAO.NAO_IDENTIFICADO]: {
    rotulo: "possivelmente não coberto",
    explicacao:
      "Possivelmente este medicamento não é coberto pelo Farmácia Popular, ou o nome não foi digitado " +
      "corretamente. Confira a grafia na receita. Ele ainda pode ser ofertado pelo SUS em listas que " +
      "esta ferramenta não consulta, como a do seu município.",
  },
};

function renderizarSugestoes(entrada, elenco) {
  const sugestoes = sugerirGrafias(entrada, elenco.itens);
  if (sugestoes.length === 0) return null;
  const bloco = criarElemento("div", "sugestoes");
  bloco.append(criarElemento("span", null, "Você quis dizer: "));
  sugestoes.forEach((sugestao) => {
    const entradaCorrigida = aplicarSugestao(entrada, sugestao);
    const botao = criarElemento("button", "botao botao--sugestao", entradaCorrigida);
    botao.type = "button";
    botao.addEventListener("click", () => consultarReceita(entradaCorrigida, elenco));
    bloco.append(botao);
  });
  return bloco;
}

function renderizarResultado(entrada, resultado, elenco) {
  const textos = TEXTOS_SITUACAO[resultado.situacao];
  const cartao = criarElemento("div", `resultado resultado--${resultado.situacao}`);
  const titulo = criarElemento("p");
  titulo.append(
    criarElemento("span", "resultado__entrada", entrada),
    criarElemento("span", "resultado__situacao", textos.rotulo),
  );
  cartao.append(titulo, criarElemento("p", null, textos.explicacao));
  if (resultado.itens.length > 0) cartao.append(listarItens(resultado.itens));
  if (resultado.situacao === SITUACAO.NAO_IDENTIFICADO) {
    const sugestoes = renderizarSugestoes(entrada, elenco);
    if (sugestoes) cartao.append(sugestoes);
  }

  resultado.itens
    .filter((item) => item.observacao)
    .forEach((item) => cartao.append(criarElemento("p", "resultado__observacao", item.observacao)));
  return cartao;
}

function paragrafoRequisitosRetirada(fonte) {
  const paragrafo = criarElemento("p", "resultado__observacao");
  paragrafo.append(
    "Requisitos de retirada estão na ",
    criarLink(fonte.url_legislacao, "legislação do Farmácia Popular"),
    ". O estoque deve ser confirmado diretamente com a farmácia ou unidade.",
  );
  return paragrafo;
}

function consultarReceita(textoReceita, elenco) {
  const entradas = separarEntradas(textoReceita);
  const resultados = entradas.map((entrada) => ({
    entrada,
    resultado: buscarMedicamento(entrada, elenco.itens),
  }));

  adicionarMensagem("usuario", entradas.join("\n"));
  const algumEncontrado = resultados.some(({ resultado }) => resultado.itens.length > 0);
  adicionarMensagem("sistema", [
    "Resultado da consulta no elenco do Farmácia Popular:",
    ...resultados.map(({ entrada, resultado }) => renderizarResultado(entrada, resultado, elenco)),
    ...(algumEncontrado ? [paragrafoRequisitosRetirada(elenco.fonte)] : []),
  ]);

  if (!algumEncontrado) {
    adicionarMensagem(
      "sistema",
      "Nenhum medicamento informado foi identificado como coberto. Confira os nomes na receita e tente novamente.",
    );
    return;
  }
  oferecerBuscaDeLocais(adicionarMensagem);
}

function mostrarErroFormulario(texto) {
  elementos.erroFormulario.textContent = texto;
  elementos.erroFormulario.hidden = !texto;
}

function habilitarFormulario(elenco) {
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
    consultarReceita(textoReceita, elenco);
    elementos.entrada.value = "";
  });
}

async function carregarElenco() {
  const resposta = await fetch(CAMINHO_ELENCO);
  if (!resposta.ok) {
    throw new Error(`falha ao carregar ${CAMINHO_ELENCO}: HTTP ${resposta.status}`);
  }
  return resposta.json();
}

async function iniciar() {
  const carregando = adicionarMensagem("sistema mensagem--carregando", "Carregando a base de medicamentos…");
  try {
    const elenco = await carregarElenco();
    carregando.remove();
    renderizarFonte(elenco.fonte);
    adicionarMensagem("sistema", [
      "Olá! Digite os medicamentos da sua receita, um por linha, com a concentração quando possível (ex.: Losartana 50 mg).",
      `Consulto o elenco oficial do Farmácia Popular atualizado em ${formatarData(elenco.fonte.data_atualizacao_fonte)}.`,
    ]);
    habilitarFormulario(elenco);
  } catch (erro) {
    console.error(erro);
    carregando.remove();
    adicionarMensagem(
      "sistema mensagem--erro",
      "Não foi possível carregar a base de medicamentos. Recarregue a página; se o problema continuar, tente mais tarde.",
    );
    elementos.dadosFonte.replaceChildren(criarElemento("dd", null, "Indisponível no momento."));
  }
}

iniciar();
