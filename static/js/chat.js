import { separarEntradas } from "./busca_medicamentos.js";
import { oferecerBuscaDeLocais } from "./busca_locais.js";
import { INTERVALO_TROCA_EXEMPLO_MS, sortearExemplo } from "./exemplos_receita.js";
import { COBERTURA, consultarCobertura, unirGruposDeRetirada } from "./consulta_cobertura.js";
import { criarElemento, criarLink, formatarData } from "./elementos_dom.js";
import { paragrafoRequisitosRetirada, renderizarConsulta } from "./resultado_consulta.js";
import { ROLAGEM } from "./rolagem.js";

const CAMINHOS_BASES = {
  farmaciaPopular: "data/reference/farmacia_popular_elenco.json",
  componenteBasico: "data/reference/rename_2024_componente_basico.json",
  nomesComerciais: "data/reference/nomes_comerciais.json",
};

const elementos = {
  mensagens: document.getElementById("mensagens"),
  formulario: document.getElementById("formulario-consulta"),
  entrada: document.getElementById("entrada-medicamentos"),
  erroFormulario: document.getElementById("erro-formulario"),
  botaoConsultar: document.getElementById("botao-consultar"),
  dadosFonte: document.getElementById("dados-fonte"),
};

const MARGEM_ROLAGEM_PX = 4;

// Respostas longas rolam até o próprio início, para a pessoa ler de cima;
// mensagens complementares (ex.: "o que levar") não mexem na rolagem.
function rolarAte(mensagem, rolagem) {
  const lista = elementos.mensagens;
  if (rolagem === ROLAGEM.FIM) lista.scrollTop = lista.scrollHeight;
  if (rolagem === ROLAGEM.INICIO) lista.scrollTop = mensagem.offsetTop - MARGEM_ROLAGEM_PX;
}

function adicionarMensagem(tipo, conteudo, rolagem = tipo === "usuario" ? ROLAGEM.FIM : ROLAGEM.INICIO) {
  const mensagem = criarElemento("div", `mensagem mensagem--${tipo}`);
  const blocos = Array.isArray(conteudo) ? conteudo : [conteudo];
  blocos.forEach((bloco) => {
    mensagem.append(typeof bloco === "string" ? criarElemento("p", null, bloco) : bloco);
  });
  elementos.mensagens.append(mensagem);
  rolarAte(mensagem, rolagem);
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
    elementos.dadosFonte.append(criarElemento("dt", null, fonte.programa ?? "Nomes comerciais"), descricao);
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
      ROLAGEM.NENHUMA,
    );
    return;
  }
  oferecerBuscaDeLocais(adicionarMensagem, unirGruposDeRetirada(consultas));
}

function mostrarErroFormulario(texto) {
  elementos.erroFormulario.textContent = texto;
  elementos.erroFormulario.hidden = !texto;
}

// O exemplo aparece como placeholder e troca a cada 4 s. Duplo clique ou um
// toque isolado no Shift copiam o exemplo para o campo, só se ele estiver
// vazio, para não apagar o que a pessoa já digitou.
function usarExemploVisivel() {
  if (elementos.entrada.value.trim() !== "") return;
  elementos.entrada.value = elementos.entrada.placeholder;
  elementos.entrada.setSelectionRange(elementos.entrada.value.length, elementos.entrada.value.length);
}

function trocarExemplo() {
  if (elementos.entrada.value.trim() !== "") return;
  elementos.entrada.placeholder = sortearExemplo(elementos.entrada.placeholder);
}

function iniciarExemplos() {
  elementos.entrada.placeholder = sortearExemplo();
  setInterval(trocarExemplo, INTERVALO_TROCA_EXEMPLO_MS);
  elementos.entrada.addEventListener("dblclick", usarExemploVisivel);

  // Só um Shift apertado e solto sozinho vale: Shift+letra (maiúscula) e
  // Shift+Enter (nova linha) não podem acionar o exemplo.
  let shiftSozinho = false;
  elementos.entrada.addEventListener("keydown", (evento) => {
    shiftSozinho = evento.key === "Shift" && !evento.repeat;
  });
  elementos.entrada.addEventListener("keyup", (evento) => {
    if (evento.key === "Shift" && shiftSozinho) usarExemploVisivel();
    shiftSozinho = false;
  });
}

function habilitarFormulario(bases) {
  [elementos.entrada, elementos.botaoConsultar].forEach((campo) => {
    campo.disabled = false;
  });
  iniciarExemplos();

  // Enter consulta; Shift+Enter quebra a linha para digitar outro medicamento.
  // isComposing evita enviar no meio de uma composição do teclado (acentos em IME).
  elementos.entrada.addEventListener("keydown", (evento) => {
    if (evento.key !== "Enter" || evento.shiftKey || evento.isComposing) return;
    evento.preventDefault();
    elementos.formulario.requestSubmit();
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
  const [farmaciaPopular, componenteBasico, nomesComerciais] = await Promise.all([
    carregarJson(CAMINHOS_BASES.farmaciaPopular),
    carregarJson(CAMINHOS_BASES.componenteBasico),
    carregarJson(CAMINHOS_BASES.nomesComerciais),
  ]);
  return { farmaciaPopular, componenteBasico, nomesComerciais };
}

async function iniciar() {
  const carregando = adicionarMensagem("sistema mensagem--carregando", "Carregando as listas de medicamentos…");
  try {
    const bases = await carregarBases();
    carregando.remove();
    renderizarFontes(bases);
    adicionarMensagem("sistema", [
      "Olá! Digite os medicamentos receitados pelo nome genérico ou comercial. Para vários, separe com ponto e vírgula.", 
      "A concentração ajuda, mas não é obrigatória.",
      "(ex.: 'Losartana 50 mg' ou somente 'Losartana')",
      "Consulto o elenco do Farmácia Popular e o Componente Básico da RENAME 2024.",
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
