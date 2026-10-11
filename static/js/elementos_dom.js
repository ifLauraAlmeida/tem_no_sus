// Criação de elementos sempre via textContent, nunca innerHTML,
// porque parte do texto vem da entrada do usuário e de fontes externas.

export function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto) elemento.textContent = texto;
  return elemento;
}

export function criarLink(url, texto) {
  const link = criarElemento("a", null, texto);
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

export function formatarData(dataIso) {
  const [ano, mes, dia] = dataIso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}
