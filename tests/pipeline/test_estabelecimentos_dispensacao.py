import pytest

from pipeline.cnes.cadastro_api import CadastroEstabelecimento
from pipeline.cnes.estabelecimentos_dispensacao import (
    agrupar_frentes_de_retirada,
    indexar_vinculo_sus,
    montar_estabelecimentos,
)
from pipeline.cnes.servicos_farmaceuticos import FrenteDisponibilizacao, ServicoFarmaceutico

MUNICIPIOS = {"170025": "Abreulândia"}


def servico(cnes="2554852", frente=FrenteDisponibilizacao.CBAF, amb_sus=True, municipio="170025"):
    return ServicoFarmaceutico(cnes, municipio, frente, amb_sus, "202608")


def cadastro(cnes="2554852"):
    return CadastroEstabelecimento(cnes, "UBS CENTRO", "RUA A", "10", "CENTRO", "77693000", -9.6, -49.1, "2026-09-01")


def test_agrupa_frentes_do_mesmo_cnes_e_descarta_hospitalar():
    servicos = [
        servico(frente=FrenteDisponibilizacao.CBAF),
        servico(frente=FrenteDisponibilizacao.CESAF),
        servico(cnes="9999999", frente=FrenteDisponibilizacao.FARMACIA_HOSPITALAR),
    ]
    agrupados = agrupar_frentes_de_retirada(servicos)
    assert list(agrupados) == ["2554852"]
    assert len(agrupados["2554852"]) == 2


def test_monta_estabelecimento_com_frentes_ordenadas_e_municipio():
    agrupados = agrupar_frentes_de_retirada(
        [servico(frente=FrenteDisponibilizacao.CESAF), servico(frente=FrenteDisponibilizacao.CBAF)]
    )
    estabelecimentos, sem_cadastro = montar_estabelecimentos(
        agrupados, {"2554852": cadastro()}, {"2554852": True}, MUNICIPIOS
    )
    assert sem_cadastro == []
    [estabelecimento] = estabelecimentos
    assert estabelecimento["frentes"] == ["CBAF", "CESAF"]
    assert estabelecimento["municipio"] == "Abreulândia"
    assert estabelecimento["endereco"]["bairro"] == "CENTRO"
    assert estabelecimento["vinculo_sus"] is True


def test_cnes_sem_cadastro_na_api_e_reportado_e_nao_descartado_em_silencio():
    agrupados = agrupar_frentes_de_retirada([servico()])
    estabelecimentos, sem_cadastro = montar_estabelecimentos(agrupados, {"2554852": None}, {}, MUNICIPIOS)
    assert estabelecimentos == []
    assert sem_cadastro == ["2554852"]


def test_municipio_inexistente_falha():
    agrupados = agrupar_frentes_de_retirada([servico(municipio="999999")])
    with pytest.raises(ValueError, match="999999"):
        montar_estabelecimentos(agrupados, {"2554852": cadastro()}, {}, MUNICIPIOS)


def test_vinculo_sus_vem_do_arquivo_st():
    assert indexar_vinculo_sus([{"CNES": "1", "VINC_SUS": "1"}, {"CNES": "2", "VINC_SUS": "0"}]) == {"1": True, "2": False}
