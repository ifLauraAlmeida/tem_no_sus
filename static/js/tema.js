// Alterna entre tema claro e escuro. Sem escolha salva, segue o sistema.
// A escolha fica só neste navegador (preferência visual, não dado pessoal).

const CHAVE_TEMA = "tema";
const consultaEscuro = window.matchMedia("(prefers-color-scheme: dark)");
const seletor = document.getElementById("seletor-tema");

function temaAtual() {
  const escolhido = document.documentElement.dataset.tema;
  if (escolhido) return escolhido;
  return consultaEscuro.matches ? "escuro" : "claro";
}

function atualizarSeletor() {
  const escuro = temaAtual() === "escuro";
  seletor.setAttribute("aria-checked", String(escuro));
  seletor.title = escuro ? "Usar tema claro" : "Usar tema escuro";
}

function salvarTema(tema) {
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch (erro) {
    // Armazenamento indisponível: o tema vale só até recarregar a página.
    console.warn("não foi possível salvar o tema:", erro);
  }
}

seletor.addEventListener("click", () => {
  const novoTema = temaAtual() === "escuro" ? "claro" : "escuro";
  document.documentElement.dataset.tema = novoTema;
  salvarTema(novoTema);
  atualizarSeletor();
});

consultaEscuro.addEventListener("change", atualizarSeletor);
atualizarSeletor();
