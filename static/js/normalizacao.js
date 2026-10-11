// Normalização usada apenas para comparação; o texto exibido ao usuário
// continua sendo o da fonte oficial.

export function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/[^a-z0-9,.\/+]+/g, " ")
    .trim();
}

// Extrai apenas os valores numéricos das dosagens. A unidade não é comparada
// porque o usuário costuma omiti-la ("losartana 50").
export function extrairDosagens(texto) {
  const numeros = normalizarTexto(texto).match(/\d+(?:[.,]\d+)?/g) ?? [];
  return numeros.map((numero) => Number(numero.replace(",", ".")));
}
