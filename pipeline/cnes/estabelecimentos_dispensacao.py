"""Base de estabelecimentos que podem ser indicados como local de retirada."""

from collections import defaultdict
from collections.abc import Iterable
from dataclasses import asdict

from pipeline.cnes.cadastro_api import CadastroEstabelecimento
from pipeline.cnes.servicos_farmaceuticos import ServicoFarmaceutico, indica_local_de_retirada

COLUNAS_ST = ("CNES", "VINC_SUS", "COMPETEN")


def agrupar_frentes_de_retirada(servicos: Iterable[ServicoFarmaceutico]) -> dict[str, list[ServicoFarmaceutico]]:
    servicos_por_cnes: dict[str, list[ServicoFarmaceutico]] = defaultdict(list)
    for servico in servicos:
        if indica_local_de_retirada(servico):
            servicos_por_cnes[servico.cnes].append(servico)
    return dict(servicos_por_cnes)


def indexar_vinculo_sus(registros_st: Iterable[dict[str, str]]) -> dict[str, bool]:
    return {registro["CNES"]: registro["VINC_SUS"] == "1" for registro in registros_st}


def montar_estabelecimento(
    servicos: list[ServicoFarmaceutico],
    cadastro: CadastroEstabelecimento,
    vinculo_sus: bool | None,
    nome_municipio: str,
) -> dict:
    dados_cadastro = asdict(cadastro)
    return {
        "cnes": cadastro.cnes,
        "nome": cadastro.nome,
        "endereco": {campo: dados_cadastro[campo] for campo in ("logradouro", "numero", "bairro", "cep")},
        "codigo_municipio": servicos[0].codigo_municipio,
        "municipio": nome_municipio,
        "latitude": cadastro.latitude,
        "longitude": cadastro.longitude,
        "frentes": sorted({servico.frente.value for servico in servicos}),
        "vinculo_sus": vinculo_sus,
        "competencia_cnes": servicos[0].competencia,
        "cadastro_atualizado_em": cadastro.data_atualizacao,
    }


def nome_do_municipio(codigo_municipio: str, municipios: dict[str, str]) -> str:
    if codigo_municipio not in municipios:
        raise ValueError(f"município {codigo_municipio!r} do CNES não encontrado na lista do IBGE da UF")
    return municipios[codigo_municipio]


def montar_estabelecimentos(
    servicos_por_cnes: dict[str, list[ServicoFarmaceutico]],
    cadastros: dict[str, CadastroEstabelecimento | None],
    vinculos_sus: dict[str, bool],
    municipios: dict[str, str],
) -> tuple[list[dict], list[str]]:
    estabelecimentos = []
    cnes_sem_cadastro = []
    for cnes, servicos in sorted(servicos_por_cnes.items()):
        cadastro = cadastros.get(cnes)
        if cadastro is None:
            cnes_sem_cadastro.append(cnes)
            continue
        municipio = nome_do_municipio(servicos[0].codigo_municipio, municipios)
        estabelecimentos.append(montar_estabelecimento(servicos, cadastro, vinculos_sus.get(cnes), municipio))
    return estabelecimentos, cnes_sem_cadastro
