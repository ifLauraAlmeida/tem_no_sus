"""Gera data/processed/estabelecimentos/{UF}.json a partir do CNES.

Uso: python -m pipeline.cnes.executar --uf TO --competencia 202608
"""

import argparse
import json
import logging
from datetime import date
from pathlib import Path

from pipeline.cnes.cadastro_api import URL_API_CNES, consultar_cadastro
from pipeline.cnes.competencia import Competencia, url_arquivo_cnes, validar_uf
from pipeline.cnes.download import baixar_arquivo_cnes, calcular_sha256
from pipeline.cnes.estabelecimentos_dispensacao import (
    COLUNAS_ST,
    agrupar_frentes_de_retirada,
    indexar_vinculo_sus,
    montar_estabelecimentos,
)
from pipeline.cnes.leitura_dbc import ler_registros_dbc
from pipeline.cnes.servicos_farmaceuticos import COLUNAS_SR, extrair_servicos_farmaceuticos
from pipeline.localidades.municipios_ibge import carregar_municipios

logger = logging.getLogger(__name__)


def descrever_fonte(arquivo_sr: Path, uf: str, competencia: Competencia) -> dict:
    return {
        "orgao": "Ministério da Saúde — DATASUS",
        "documento": "CNES — Serviço especializado 125 (serviço de farmácia)",
        "competencia_cnes": competencia.como_texto(),
        "url_sr": url_arquivo_cnes("SR", uf, competencia),
        "sha256_sr": calcular_sha256(arquivo_sr),
        "url_cadastro": URL_API_CNES,
        "data_obtencao": date.today().isoformat(),
    }


def atualizar_indice(diretorio_saida: Path, uf: str, competencia: Competencia, quantidade: int) -> None:
    # O frontend lê este índice para saber quais UFs já têm base gerada.
    arquivo_indice = diretorio_saida / "indice.json"
    indice = json.loads(arquivo_indice.read_text(encoding="utf-8")) if arquivo_indice.exists() else {"ufs": {}}
    indice["ufs"][uf] = {"competencia_cnes": competencia.como_texto(), "estabelecimentos": quantidade}
    indice["ufs"] = dict(sorted(indice["ufs"].items()))
    arquivo_indice.write_text(json.dumps(indice, ensure_ascii=False, indent=1), encoding="utf-8")


def gerar_base_estabelecimentos(uf: str, competencia: Competencia, raiz_dados: Path) -> Path:
    raiz_bruta = raiz_dados / "raw"
    arquivo_sr = baixar_arquivo_cnes(raiz_bruta, "SR", uf, competencia)
    arquivo_st = baixar_arquivo_cnes(raiz_bruta, "ST", uf, competencia)

    servicos = extrair_servicos_farmaceuticos(ler_registros_dbc(arquivo_sr, COLUNAS_SR))
    servicos_por_cnes = agrupar_frentes_de_retirada(servicos)
    vinculos_sus = indexar_vinculo_sus(ler_registros_dbc(arquivo_st, COLUNAS_ST))
    logger.info("%d serviços 125; %d estabelecimentos elegíveis", len(servicos), len(servicos_por_cnes))

    diretorio_api = raiz_bruta / "cnes" / "api"
    cadastros = {cnes: consultar_cadastro(cnes, diretorio_api) for cnes in servicos_por_cnes}
    municipios = carregar_municipios(uf, raiz_bruta / "ibge")
    estabelecimentos, cnes_sem_cadastro = montar_estabelecimentos(
        servicos_por_cnes, cadastros, vinculos_sus, municipios
    )
    if cnes_sem_cadastro:
        logger.warning("%d cnes sem cadastro na api: %s", len(cnes_sem_cadastro), cnes_sem_cadastro)

    saida = raiz_dados / "processed" / "estabelecimentos" / f"{uf}.json"
    saida.parent.mkdir(parents=True, exist_ok=True)
    conteudo = {
        "fonte": descrever_fonte(arquivo_sr, uf, competencia),
        "uf": uf,
        "estabelecimentos": estabelecimentos,
        "cnes_sem_cadastro": cnes_sem_cadastro,
    }
    saida.write_text(json.dumps(conteudo, ensure_ascii=False, indent=1), encoding="utf-8")
    atualizar_indice(saida.parent, uf, competencia, len(estabelecimentos))
    logger.info("gravado %s com %d estabelecimentos", saida, len(estabelecimentos))
    return saida


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--uf", required=True)
    parser.add_argument("--competencia", required=True, help="aaaamm")
    parser.add_argument("--raiz-dados", type=Path, default=Path("data"))
    argumentos = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    gerar_base_estabelecimentos(
        validar_uf(argumentos.uf), Competencia.de_texto(argumentos.competencia), argumentos.raiz_dados
    )


if __name__ == "__main__":
    main()
