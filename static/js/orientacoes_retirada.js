import { criarElemento, criarLink } from "./elementos_dom.js";
import { GRUPO_POR_FRENTE } from "./selecao_estabelecimentos.js";

const URL_FARMACIA_POPULAR = "https://www.gov.br/saude/pt-br/composicao/sectics/farmacia-popular";
const URL_PORTARIA_344 = "https://bvsms.saude.gov.br/bvs/saudelegis/svs/1998/prt0344_12_05_1998_rep.html";
const URL_RDC_471 =
  "https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=detalharAto&tipo=RDC&numeroAto=00000471&seqAto=000&valorAno=2021&orgao=RDC%2FDC%2FANVISA%2FMS&nomeTitulo=codigos&desItem=&desItemFim=&cod_modulo=310&cod_menu=9882";

// Textos baseados nas orientações do Ministério da Saúde (Farmácia Popular),
// na Portaria SVS/MS 344/1998 (com a RDC Anvisa 1.000/2025) e na RDC Anvisa 471/2021.
const ITENS_FARMACIA_POPULAR = [
  "Documento oficial com foto e CPF (ou identidade em que conste o número do CPF).",
  "Receita médica dentro do prazo de validade, do SUS ou de serviço particular.",
  "Se outra pessoa for retirar: a receita, documento com foto e CPF do paciente e do representante, " +
    "e decisão judicial ou procuração (pública, ou particular com firma reconhecida ou assinatura eletrônica) " +
    "com poderes para retirar medicamentos no programa.",
];

const ITENS_REDE_PUBLICA = [
  "Receita com nome do paciente, nome do medicamento, data, assinatura e identificação de quem prescreveu (carimbo ou registro profissional).",
  "Documento com foto e o Cartão Nacional de Saúde (Cartão SUS) ou CPF.",
  "Alguns municípios pedem comprovante de residência; confirme com a unidade.",
];

const ITENS_RECEITA_ESPECIAL = [
  "Medicamento controlado (receita de controle especial): em papel, a receita vem em 2 vias e uma fica retida; vale 30 dias a partir da emissão. A receita eletrônica emitida pelo sistema da Anvisa dispensa as 2 vias.",
  "Antibiótico: receita em 2 vias, uma fica retida; vale 10 dias a partir da emissão.",
];

function criarSecao(titulo, itens, fonte) {
  const secao = criarElemento("div", "orientacoes__secao");
  const lista = criarElemento("ul");
  itens.forEach((item) => lista.append(criarElemento("li", null, item)));
  secao.append(criarElemento("p", "resultado__programa-titulo", titulo), lista);
  if (fonte) secao.append(fonte);
  return secao;
}

function paragrafoFontes(partes) {
  const paragrafo = criarElemento("p", "resultado__observacao");
  paragrafo.append(...partes);
  return paragrafo;
}

export function mensagemOQueLevar(gruposDeRetirada) {
  const blocos = ["O que levar para retirar o medicamento:"];
  if (gruposDeRetirada.has(GRUPO_POR_FRENTE.FARMACIA_POPULAR)) {
    const fonte = paragrafoFontes(["Fonte: ", criarLink(URL_FARMACIA_POPULAR, "Ministério da Saúde — Farmácia Popular"), "."]);
    blocos.push(criarSecao("Na farmácia do Farmácia Popular", ITENS_FARMACIA_POPULAR, fonte));
  }
  if (gruposDeRetirada.has(GRUPO_POR_FRENTE.CBAF)) {
    const aviso = paragrafoFontes(["Cada município define seus documentos; estes são os mais pedidos."]);
    blocos.push(criarSecao("Na UBS ou farmácia municipal", ITENS_REDE_PUBLICA, aviso));
  }
  const fontesEspeciais = paragrafoFontes([
    "Fontes: ",
    criarLink(URL_PORTARIA_344, "Portaria SVS/MS 344/1998"),
    " (atualizada pela RDC Anvisa 1.000/2025) e ",
    criarLink(URL_RDC_471, "RDC Anvisa 471/2021"),
    ".",
  ]);
  blocos.push(criarSecao("Se o medicamento for controlado ou antibiótico", ITENS_RECEITA_ESPECIAL, fontesEspeciais));
  return blocos;
}
