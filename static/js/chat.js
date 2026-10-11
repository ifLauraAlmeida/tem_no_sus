import { buscarMedicamento, separarEntradas, SITUACAO } from "./busca_medicamentos.js";

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

function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto) elemento.textContent = texto;
  return elemento;
}

function criarLink(url, texto) {
  const link = criarElemento("a", null, texto);
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function formatarData(dataIso) {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

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
  [SITUACAO.AMBIGUO]: {
    rotulo: "confirme a apresentação",
    explicacao: "Há mais de uma apresentação no elenco. Confira na receita qual corresponde à sua:",
  },
  [SITUACAO.CONCENTRACAO_NAO_LISTADA]: {
    rotulo: "concentração não listada",
    explicacao: "O princípio ativo consta no elenco, mas não na concentração informada. Concentrações listadas:",
  },
  [SITUACAO.NAO_IDENTIFICADO]: {
    rotulo: "não identificado",
    explicacao:
      "Não encontrado no elenco do Farmácia Popular. Isso não significa que não seja ofertado pelo SUS: " +
      "ele pode constar na RENAME ou na lista do seu município, que esta ferramenta ainda não consulta.",
  },
};

function renderizarResultado(entrada, resultado) {
  const textos = TEXTOS_SITUACAO[resultado.situacao];
  const cartao = criarElemento("div", `resultado resultado--${resultado.situacao}`);
  const titulo = criarElemento("p");
  titulo.append(
    criarElemento("span", "resultado__entrada", entrada),
    criarElemento("span", "resultado__situacao", textos.rotulo),
  );
  cartao.append(titulo, criarElemento("p", null, textos.explicacao));
  if (resultado.itens.length > 0) cartao.append(listarItens(resultado.itens));

  resultado.itens
    .filter((item) => item.observacao)
    .forEach((item) => cartao.append(criarElemento("p", "resultado__observacao", item.observacao)));
  return cartao;
}

function mensagemProximosPassos(fonte) {
  const paragrafo = criarElemento("p");
  paragrafo.append(
    "Para encontrar farmácias credenciadas, consulte o ",
    criarLink(fonte.url_farmacias, "painel oficial do programa"),
    ". Requisitos de retirada estão na ",
    criarLink(fonte.url_legislacao, "legislação do Farmácia Popular"),
    ". O estoque deve ser confirmado diretamente com a farmácia.",
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
  adicionarMensagem("sistema", [
    "Resultado da consulta no elenco do Farmácia Popular:",
    ...resultados.map(({ entrada, resultado }) => renderizarResultado(entrada, resultado)),
  ]);

  const algumEncontrado = resultados.some(({ resultado }) => resultado.itens.length > 0);
  if (algumEncontrado) adicionarMensagem("sistema", mensagemProximosPassos(elenco.fonte));
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
