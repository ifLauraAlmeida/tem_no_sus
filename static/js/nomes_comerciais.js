import { extrairDosagens, normalizarTexto } from "./normalizacao.js";

function contemNome(entradaNormalizada, nome) {
  return ` ${entradaNormalizada} `.includes(` ${nome} `);
}

// Troca a marca pelo princípio ativo, preservando a dosagem digitada,
// para que a busca nas listas públicas (que usam a DCB) funcione.
export function resolverNomeComercial(entrada, nomesComerciais) {
  const entradaNormalizada = normalizarTexto(entrada);
  const marcas = Object.keys(nomesComerciais).filter((nome) => contemNome(entradaNormalizada, nome));
  if (marcas.length === 0) return null;
  const marca = marcas.reduce((maior, atual) => (atual.length > maior.length ? atual : maior));
  const principios = nomesComerciais[marca];
  const dosagens = extrairDosagens(entrada).map((dose) => String(dose).replace(".", ","));
  return {
    marca,
    principios,
    entradaConvertida: [...principios, ...dosagens].join(" "),
  };
}
