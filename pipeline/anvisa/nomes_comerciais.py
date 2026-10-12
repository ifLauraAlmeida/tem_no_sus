"""Relaciona nomes comerciais (ANVISA) aos princípios ativos das listas públicas.

Uso: python -m pipeline.anvisa.nomes_comerciais --csv data/raw/anvisa/DADOS_ABERTOS_MEDICAMENTOS.csv

Uma marca só é associada quando todos os seus componentes correspondem a um
princípio ativo das listas usadas; associações (ex.: dipirona + cafeína)
ficam de fora para não indicar como coberto um produto diferente.
"""

import argparse
import csv
import html
import json
import logging
import re
from collections import defaultdict
from collections.abc import Iterable
from datetime import date
from pathlib import Path

from pipeline.cnes.download import calcular_sha256
from pipeline.rename.termos_busca import derivar_termos_busca, normalizar

logger = logging.getLogger(__name__)

URL_DADOS_ANVISA = "https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv"
CATEGORIAS_COM_NOME_COMERCIAL = frozenset({"Novo", "Similar", "Específico", "Biológico"})
BASES_DE_REFERENCIA = (
    Path("data/reference/farmacia_popular_elenco.json"),
    Path("data/reference/rename_2024_componente_basico.json"),
)
SAIDA_PADRAO = Path("data/reference/nomes_comerciais.json")
TAMANHO_MINIMO_NOME = 4

# Qualificadores físicos que a ANVISA acrescenta ao princípio ativo e que não
# mudam a substância: "sulfato de salbutamol micronizado" é salbutamol.
QUALIFICADORES_FISICOS = re.compile(
    r"\b(micronizad[oa]|anidr[oa]|monoidratad[oa]|di-?hidratad[oa]|tri-?hidratad[oa]|hidratad[oa]|"
    r"solucao de|po de|revestid[oa]s?)\b"
)


def limpar_componente(componente: str) -> str:
    sem_qualificadores = QUALIFICADORES_FISICOS.sub(" ", normalizar(html.unescape(componente)))
    return re.sub(r"\s+", " ", sem_qualificadores).strip()


def componentes_do_principio(principio_ativo: str) -> list[str]:
    componentes = (limpar_componente(parte) for parte in principio_ativo.split(","))
    return sorted({componente for componente in componentes if componente})


def termo_conhecido(componente: str, termos_conhecidos: frozenset[str]) -> str | None:
    correspondentes = [termo for termo in derivar_termos_busca(componente) if termo in termos_conhecidos]
    return min(correspondentes, key=len) if correspondentes else None


def principios_do_registro(principio_ativo: str, termos_conhecidos: frozenset[str]) -> frozenset[str] | None:
    termos = [termo_conhecido(componente, termos_conhecidos) for componente in componentes_do_principio(principio_ativo)]
    if not termos or None in termos:
        return None
    return frozenset(termos)


def ler_registros_anvisa(caminho_csv: Path) -> Iterable[dict[str, str]]:
    with caminho_csv.open(encoding="latin-1", newline="") as arquivo:
        yield from csv.DictReader(arquivo, delimiter=";")


def relacionar_nomes(registros: Iterable[dict[str, str]], termos_conhecidos: frozenset[str]) -> dict[str, list[str]]:
    principios_por_nome: dict[str, set[frozenset[str] | None]] = defaultdict(set)
    for registro in registros:
        if registro.get("CATEGORIA_REGULATORIA") not in CATEGORIAS_COM_NOME_COMERCIAL:
            continue
        nome = normalizar(html.unescape(registro.get("NOME_PRODUTO") or ""))
        principio = registro.get("PRINCIPIO_ATIVO") or ""
        if len(nome) < TAMANHO_MINIMO_NOME or not principio or nome in termos_conhecidos:
            continue
        principios_por_nome[nome].add(principios_do_registro(principio, termos_conhecidos))
    # Marcas com registros divergentes (ou com algum componente fora das
    # listas) são descartadas por ambiguidade.
    return {
        nome: sorted(next(iter(conjuntos)))
        for nome, conjuntos in sorted(principios_por_nome.items())
        if len(conjuntos) == 1 and None not in conjuntos
    }


def carregar_termos_conhecidos(bases: Iterable[Path]) -> frozenset[str]:
    termos = set()
    for base in bases:
        itens = json.loads(base.read_text(encoding="utf-8"))["itens"]
        termos.update(normalizar(termo) for item in itens for termo in item["termos_busca"])
    return frozenset(termos)


def gerar_nomes_comerciais(caminho_csv: Path, saida: Path) -> None:
    termos_conhecidos = carregar_termos_conhecidos(BASES_DE_REFERENCIA)
    nomes = relacionar_nomes(ler_registros_anvisa(caminho_csv), termos_conhecidos)
    conteudo = {
        "fonte": {
            "orgao": "Agência Nacional de Vigilância Sanitária (ANVISA)",
            "documento": "Dados abertos de medicamentos registrados",
            "url": URL_DADOS_ANVISA,
            "sha256": calcular_sha256(caminho_csv),
            "data_obtencao": date.today().isoformat(),
        },
        "nomes": nomes,
    }
    saida.write_text(json.dumps(conteudo, ensure_ascii=False, indent=0), encoding="utf-8")
    logger.info("gravado %s com %d nomes comerciais", saida, len(nomes))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, required=True)
    parser.add_argument("--saida", type=Path, default=SAIDA_PADRAO)
    argumentos = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    gerar_nomes_comerciais(argumentos.csv, argumentos.saida)


if __name__ == "__main__":
    main()
