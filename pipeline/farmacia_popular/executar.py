"""Gera data/processed/farmacia_popular/{UF}.json com as farmácias credenciadas.

Uso: python -m pipeline.farmacia_popular.executar \
       --base-cnes data/raw/cnes/base_completa/BASE_DE_DADOS_CNES_202608.ZIP \
       --dir-receita data/raw/receita/cnpj/2026-09
"""

import argparse
import json
import logging
from collections import defaultdict
from datetime import date
from pathlib import Path

from pipeline.farmacia_popular import cadastro_receita
from pipeline.farmacia_popular.cadastro_receita import CadastroReceita
from pipeline.farmacia_popular.coordenadas_cnes import LocalizacaoCnes, indexar_por_cnpj, ler_tb_estabelecimento
from pipeline.localidades.centro_cep import CentrosCep
from pipeline.farmacia_popular.painel_credenciadas import (
    URL_PAINEL,
    FarmaciaCredenciada,
    converter_linha,
    ler_painel,
    validar_total,
)

logger = logging.getLogger(__name__)
DIRETORIO_SAIDA = Path("data/processed/farmacia_popular")


def primeiro_preenchido(*valores: str | None) -> str | None:
    return next((valor for valor in valores if valor), None)


PRECISAO_ENDERECO = "endereco"
PRECISAO_CENTRO_CEP = "centro_cep"


def localizar(localizacao: LocalizacaoCnes | None, cep: str | None, centros_cep: CentrosCep) -> dict:
    # Coordenada do CNES quando existe; senão, estimativa pelo centro do CEP (CNEFE/IBGE).
    if localizacao and localizacao.latitude is not None:
        return {"latitude": localizacao.latitude, "longitude": localizacao.longitude, "precisao_localizacao": PRECISAO_ENDERECO}
    centro = centros_cep.centro(cep)
    if centro:
        return {"latitude": centro[0], "longitude": centro[1], "precisao_localizacao": PRECISAO_CENTRO_CEP}
    return {"latitude": None, "longitude": None, "precisao_localizacao": None}


def montar_farmacia(
    farmacia: FarmaciaCredenciada,
    localizacao: LocalizacaoCnes | None,
    receita: CadastroReceita | None,
    centros_cep: CentrosCep,
) -> dict:
    # O painel traz só a razão social e o logradouro sem número. O nome
    # fantasia (como a farmácia aparece na fachada e nos mapas), o endereço
    # completo e o CEP vêm da Receita; o CNES complementa e dá as coordenadas.
    cep = primeiro_preenchido(receita and receita.cep, localizacao and localizacao.cep)
    return {
        "cnpj": farmacia.cnpj,
        "cnes": localizacao.cnes if localizacao else None,
        "nome": primeiro_preenchido(
            receita and receita.nome_fantasia, localizacao and localizacao.nome_fantasia, farmacia.nome
        ),
        "razao_social": farmacia.nome,
        "endereco": {
            "logradouro": primeiro_preenchido(receita and receita.logradouro, farmacia.logradouro),
            "numero": primeiro_preenchido(receita and receita.numero, localizacao and localizacao.numero),
            "bairro": primeiro_preenchido(farmacia.bairro, receita and receita.bairro),
            "cep": cep,
        },
        "codigo_municipio": farmacia.codigo_municipio,
        "municipio": farmacia.municipio,
        **localizar(localizacao, cep, centros_cep),
        "frentes": ["FARMACIA_POPULAR"],
        "data_credenciamento": farmacia.data_credenciamento,
    }


def agrupar_por_uf(
    farmacias: list[FarmaciaCredenciada],
    localizacoes: dict[str, LocalizacaoCnes],
    cadastros_receita: dict[str, CadastroReceita],
    centros_cep: CentrosCep,
) -> dict[str, list[dict]]:
    por_uf: dict[str, list[dict]] = defaultdict(list)
    for farmacia in sorted(farmacias, key=lambda f: (f.uf, f.municipio, f.nome, f.cnpj)):
        cnpj = farmacia.cnpj
        por_uf[farmacia.uf].append(montar_farmacia(farmacia, localizacoes.get(cnpj), cadastros_receita.get(cnpj), centros_cep))
    return dict(por_uf)


def descrever_fonte(data_referencia: str, caminho_base_cnes: Path, diretorio_receita: Path) -> dict:
    return {
        "programa": "Programa Farmácia Popular do Brasil",
        "orgao": "Ministério da Saúde",
        "documento": "Consulta de Endereço das Farmácias (farmácias ativas)",
        "url": URL_PAINEL,
        "data_referencia": data_referencia,
        "data_obtencao": date.today().isoformat(),
        "coordenadas": f"CNES, base completa {caminho_base_cnes.name}, cruzada pelo CNPJ; "
        "sem coordenada no CNES, centro do CEP calculado pelo CNEFE (IBGE, Censo 2022)",
        "nome_fantasia_e_endereco": f"Receita Federal, dados abertos do CNPJ ({diretorio_receita.name}), cruzados pelo CNPJ",
    }


def gravar_por_uf(farmacias_por_uf: dict[str, list[dict]], fonte: dict, diretorio: Path) -> None:
    diretorio.mkdir(parents=True, exist_ok=True)
    indice = {}
    for uf, farmacias in farmacias_por_uf.items():
        por_precisao = {precisao: sum(1 for f in farmacias if f["precisao_localizacao"] == precisao)
                        for precisao in (PRECISAO_ENDERECO, PRECISAO_CENTRO_CEP)}
        conteudo = {"fonte": fonte, "uf": uf, "estabelecimentos": farmacias}
        (diretorio / f"{uf}.json").write_text(json.dumps(conteudo, ensure_ascii=False, indent=0), encoding="utf-8")
        indice[uf] = {"farmacias": len(farmacias), "localizacao_por_endereco": por_precisao["endereco"],
                      "localizacao_por_centro_cep": por_precisao["centro_cep"]}
    conteudo_indice = {"fonte": fonte, "ufs": dict(sorted(indice.items()))}
    (diretorio / "indice.json").write_text(json.dumps(conteudo_indice, ensure_ascii=False, indent=1), encoding="utf-8")


def ler_cadastros_receita(diretorio_receita: Path, cnpjs: set[str]) -> dict[str, CadastroReceita]:
    arquivos = sorted(diretorio_receita.glob("Estabelecimentos*.zip"))
    if len(arquivos) != 10:
        raise FileNotFoundError(f"esperados 10 arquivos Estabelecimentos*.zip em {diretorio_receita}; encontrados {len(arquivos)}")
    return cadastro_receita.indexar_por_cnpj(cadastro_receita.ler_linhas_receita(arquivos), cnpjs)


def gerar_base_farmacia_popular(
    caminho_base_cnes: Path, diretorio_receita: Path, diretorio_saida: Path = DIRETORIO_SAIDA
) -> None:
    resultado = ler_painel()
    validar_total(resultado)
    farmacias = [converter_linha(linha) for linha in resultado["linhas"]]
    cnpjs = {farmacia.cnpj for farmacia in farmacias}
    localizacoes = indexar_por_cnpj(ler_tb_estabelecimento(caminho_base_cnes), cnpjs)
    cadastros_receita = ler_cadastros_receita(diretorio_receita, cnpjs)
    com_coordenadas = sum(1 for local in localizacoes.values() if local.latitude is not None)
    com_fantasia = sum(1 for cadastro in cadastros_receita.values() if cadastro.nome_fantasia)
    logger.info(
        "%d farmácias; %d com coordenadas no CNES; %d na Receita, %d com nome fantasia",
        len(farmacias), com_coordenadas, len(cadastros_receita), com_fantasia,
    )
    fonte = descrever_fonte(resultado["dataReferencia"], caminho_base_cnes, diretorio_receita)
    farmacias_por_uf = agrupar_por_uf(farmacias, localizacoes, cadastros_receita, CentrosCep())
    gravar_por_uf(farmacias_por_uf, fonte, diretorio_saida)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-cnes", type=Path, required=True)
    parser.add_argument("--dir-receita", type=Path, required=True, help="pasta com Estabelecimentos0..9.zip")
    argumentos = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    gerar_base_farmacia_popular(argumentos.base_cnes, argumentos.dir_receita)


if __name__ == "__main__":
    main()
