import { SITUACAO } from "./busca_medicamentos.js";
import { COBERTURA } from "./consulta_cobertura.js";
import { criarElemento, criarLink } from "./elementos_dom.js";
import { aplicarSugestao, sugerirGrafias } from "./sugestao_grafia.js";

const ROTULO_COBERTURA = {
  [COBERTURA.COBERTO]: "coberto",
  [COBERTURA.CONCENTRACAO_DIFERENTE]: "confira a concentração",
  [COBERTURA.NAO_COBERTO]: "possivelmente não coberto",
};

const EXPLICACAO_SITUACAO = {
  [SITUACAO.IDENTIFICADO]: "Consta na lista:",
  [SITUACAO.SEM_CONCENTRACAO_INFORMADA]: "Consta na lista. Concentrações disponíveis:",
  [SITUACAO.AMBIGUO]: "Há mais de uma apresentação. Confira na receita qual corresponde à sua:",
  [SITUACAO.CONCENTRACAO_NAO_LISTADA]: "O princípio ativo consta, mas não na concentração informada. Concentrações listadas:",
};

const PROGRAMAS = {
  farmaciaPopular: {
    titulo: "Farmácia Popular",
    descricao: "Gratuito nas farmácias e drogarias credenciadas ao programa.",
  },
  componenteBasico: {
    titulo: "Rede pública — Componente Básico (RENAME 2024)",
    descricao:
      "Previsto na relação nacional para UBS e farmácias municipais. A oferta depende da lista do seu município.",
  },
};

const TEXTO_NAO_COBERTO =
  "Possivelmente este medicamento não é coberto pelo Farmácia Popular nem pelo Componente Básico, ou o nome " +
  "não foi digitado corretamente. Confira a grafia na receita. Medicamentos especializados ou de listas " +
  "estaduais e municipais ainda não são consultados por esta ferramenta.";

function descreverItem(item) {
  return item.indicacao ? `${item.descricao_original} — ${item.indicacao}` : item.descricao_original;
}

function renderizarPrograma(chave, resultado) {
  const programa = PROGRAMAS[chave];
  const secao = criarElemento("div", "resultado__programa");
  secao.append(
    criarElemento("p", "resultado__programa-titulo", programa.titulo),
    criarElemento("p", "resultado__observacao", programa.descricao),
    criarElemento("p", null, EXPLICACAO_SITUACAO[resultado.situacao]),
  );
  const lista = criarElemento("ul");
  resultado.itens.forEach((item) => lista.append(criarElemento("li", null, descreverItem(item))));
  secao.append(lista);
  resultado.itens
    .filter((item) => item.observacao)
    .forEach((item) => secao.append(criarElemento("p", "resultado__observacao", item.observacao)));
  return secao;
}

function renderizarSugestoes(entrada, itensConhecidos, aoEscolherSugestao) {
  const sugestoes = sugerirGrafias(entrada, itensConhecidos);
  if (sugestoes.length === 0) return null;
  const bloco = criarElemento("div", "sugestoes");
  bloco.append(criarElemento("span", null, "Você quis dizer: "));
  sugestoes.forEach((sugestao) => {
    const entradaCorrigida = aplicarSugestao(entrada, sugestao);
    const botao = Object.assign(criarElemento("button", "botao botao--sugestao", entradaCorrigida), { type: "button" });
    botao.addEventListener("click", () => aoEscolherSugestao(entradaCorrigida));
    bloco.append(botao);
  });
  return bloco;
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function avisoNomeComercial({ marca, principios }) {
  const marcaExibida = capitalizar(marca);
  return criarElemento(
    "p",
    "aviso-nome-comercial",
    `“${marcaExibida}” é nome comercial de ${principios.join(" + ")} (registro na ANVISA). ` +
      `Os programas públicos oferecem o medicamento pelo princípio ativo, como genérico ou similar, ` +
      `e não necessariamente a marca ${marcaExibida}.`,
  );
}

export function renderizarConsulta(consulta, { itensConhecidos, aoEscolherSugestao }) {
  const cartao = criarElemento("div", `resultado resultado--${consulta.cobertura}`);
  const titulo = criarElemento("p");
  titulo.append(
    criarElemento("span", "resultado__entrada", consulta.entrada),
    criarElemento("span", "resultado__situacao", ROTULO_COBERTURA[consulta.cobertura]),
  );
  cartao.append(titulo);
  if (consulta.nomeComercial) cartao.append(avisoNomeComercial(consulta.nomeComercial));

  if (consulta.cobertura === COBERTURA.NAO_COBERTO) {
    cartao.append(criarElemento("p", null, TEXTO_NAO_COBERTO));
    const sugestoes = renderizarSugestoes(consulta.entrada, itensConhecidos, aoEscolherSugestao);
    if (sugestoes) cartao.append(sugestoes);
    return cartao;
  }
  ["farmaciaPopular", "componenteBasico"]
    .filter((chave) => consulta[chave].itens.length > 0)
    .forEach((chave) => cartao.append(renderizarPrograma(chave, consulta[chave])));
  return cartao;
}

export function paragrafoRequisitosRetirada(urlLegislacaoFarmaciaPopular) {
  const paragrafo = criarElemento("p", "resultado__observacao");
  paragrafo.append(
    "Leve a receita e um documento com foto. Requisitos do programa estão na ",
    criarLink(urlLegislacaoFarmaciaPopular, "legislação do Farmácia Popular"),
    ". Estar em uma lista não garante estoque: confirme com a farmácia ou unidade.",
  );
  return paragrafo;
}
