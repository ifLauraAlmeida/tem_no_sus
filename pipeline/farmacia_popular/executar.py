"""Gera data/processed/farmacia_popular/{UF}.json com as farmácias credenciadas.

Uso: python -m pipeline.farmacia_popular.executar --base-cnes data/raw/cnes/base_completa/BASE_DE_DADOS_CNES_202608.ZIP
"""

import argparse
import json
import logging
from collections import defaultdict
from datetime import date
from pathlib import Path

from pipeline.farmacia_popular.coordenadas_cnes import LocalizacaoCnes, indexar_por_cnpj, ler_tb_estabelecimento
from pipeline.farmacia_popular.painel_credenciadas import (
    URL_PAINEL,
    FarmaciaCredenciada,
    converter_linha,
    ler_painel,
    validar_total,
)

logger = logging.getLogger(__name__)
DIRETORIO_SAIDA = Path("data/processed/farmacia_popular")


def montar_farmacia(farmacia: FarmaciaCredenciada, localizacao: LocalizacaoCnes | None) -> dict:
    # O painel traz a razão social; o nome fantasia (como a farmácia aparece
    # na fachada e nos mapas) vem do CNES quando o CNPJ é encontrado lá.
    nome_fantasia = localizacao.nome_fantasia if localizacao else None
    return {
        "cnpj": farmacia.cnpj,
        "cnes": localizacao.cnes if localizacao else None,
        "nome": nome_fantasia or farmacia.nome,
        "razao_social": farmacia.nome,
        "endereco": {
            "logradouro": farmacia.logradouro,
            "numero": localizacao.numero if localizacao else None,
            "bairro": farmacia.bairro,
            "cep": localizacao.cep if localizacao else None,
        },
        "codigo_municipio": farmacia.codigo_municipio,
        "municipio": farmacia.municipio,
        "latitude": localizacao.latitude if localizacao else None,
        "longitude": localizacao.longitude if localizacao else None,
        "frentes": ["FARMACIA_POPULAR"],
        "data_credenciamento": farmacia.data_credenciamento,
    }


def agrupar_por_uf(farmacias: list[FarmaciaCredenciada], localizacoes: dict[str, LocalizacaoCnes]) -> dict[str, list[dict]]:
    por_uf: dict[str, list[dict]] = defaultdict(list)
    for farmacia in sorted(farmacias, key=lambda f: (f.uf, f.municipio, f.nome, f.cnpj)):
        por_uf[farmacia.uf].append(montar_farmacia(farmacia, localizacoes.get(farmacia.cnpj)))
    return dict(por_uf)


def descrever_fonte(data_referencia: str, caminho_base_cnes: Path) -> dict:
    return {
        "programa": "Programa Farmácia Popular do Brasil",
        "orgao": "Ministério da Saúde",
        "documento": "Consulta de Endereço das Farmácias (farmácias ativas)",
        "url": URL_PAINEL,
        "data_referencia": data_referencia,
        "data_obtencao": date.today().isoformat(),
        "coordenadas": f"CNES, base completa {caminho_base_cnes.name}, cruzada pelo CNPJ",
    }


def gravar_por_uf(farmacias_por_uf: dict[str, list[dict]], fonte: dict, diretorio: Path) -> None:
    diretorio.mkdir(parents=True, exist_ok=True)
    indice = {}
    for uf, farmacias in farmacias_por_uf.items():
        com_coordenadas = sum(1 for farmacia in farmacias if farmacia["latitude"] is not None)
        conteudo = {"fonte": fonte, "uf": uf, "estabelecimentos": farmacias}
        (diretorio / f"{uf}.json").write_text(json.dumps(conteudo, ensure_ascii=False, indent=0), encoding="utf-8")
        indice[uf] = {"farmacias": len(farmacias), "com_coordenadas": com_coordenadas}
    conteudo_indice = {"fonte": fonte, "ufs": dict(sorted(indice.items()))}
    (diretorio / "indice.json").write_text(json.dumps(conteudo_indice, ensure_ascii=False, indent=1), encoding="utf-8")


def gerar_base_farmacia_popular(caminho_base_cnes: Path, diretorio_saida: Path = DIRETORIO_SAIDA) -> None:
    resultado = ler_painel()
    validar_total(resultado)
    farmacias = [converter_linha(linha) for linha in resultado["linhas"]]
    localizacoes = indexar_por_cnpj(ler_tb_estabelecimento(caminho_base_cnes), {f.cnpj for f in farmacias})
    com_coordenadas = sum(1 for local in localizacoes.values() if local.latitude is not None)
    logger.info("%d farmácias; %d com coordenadas no CNES", len(farmacias), com_coordenadas)
    fonte = descrever_fonte(resultado["dataReferencia"], caminho_base_cnes)
    gravar_por_uf(agrupar_por_uf(farmacias, localizacoes), fonte, diretorio_saida)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-cnes", type=Path, required=True)
    argumentos = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    gerar_base_farmacia_popular(argumentos.base_cnes)


if __name__ == "__main__":
    main()
