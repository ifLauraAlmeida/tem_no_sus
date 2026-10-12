// Exemplos mostrados no campo de medicamentos. Todos constam nas listas
// consultadas (ver tests/exemplos_receita.test.js), para o exemplo sempre
// levar a uma resposta útil.
export const MEDICAMENTOS_EXEMPLO = Object.freeze([
  "Losartana 50 mg",
  "Metformina 850 mg",
  "Sinvastatina 20 mg",
  "Aerolin",
  "Enalapril 10 mg",
  "Glibenclamida 5 mg",
  "Dipirona 500 mg",
  "Omeprazol 20 mg",
  "Hidroclorotiazida 25 mg",
  "Atenolol 25 mg",
  "Paracetamol 500 mg",
  "Insulina NPH",
]);

export const INTERVALO_TROCA_EXEMPLO_MS = 4000;
const SEPARADOR = "; ";

function sortearIndice(tamanho, aleatorio) {
  return Math.floor(aleatorio() * tamanho);
}

// Sorteia 1 ou 2 medicamentos diferentes, evitando repetir o exemplo atual.
export function sortearExemplo(exemploAtual = "", aleatorio = Math.random) {
  for (let tentativa = 0; tentativa < 10; tentativa += 1) {
    const quantidade = aleatorio() < 0.5 ? 1 : 2;
    const primeiro = sortearIndice(MEDICAMENTOS_EXEMPLO.length, aleatorio);
    const escolhidos = [MEDICAMENTOS_EXEMPLO[primeiro]];
    if (quantidade === 2) {
      const restantes = MEDICAMENTOS_EXEMPLO.filter((_, indice) => indice !== primeiro);
      escolhidos.push(restantes[sortearIndice(restantes.length, aleatorio)]);
    }
    const exemplo = escolhidos.join(SEPARADOR);
    if (exemplo !== exemploAtual) return exemplo;
  }
  return MEDICAMENTOS_EXEMPLO[0];
}
