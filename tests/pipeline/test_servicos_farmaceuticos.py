import pytest

from pipeline.cnes.servicos_farmaceuticos import (
    FrenteDisponibilizacao,
    classificar_frente,
    extrair_servicos_farmaceuticos,
    indica_local_de_retirada,
)


def registro_sr(serv_esp="125", class_sr="005", amb_sus="1", cnes="2554852"):
    return {
        "CNES": cnes,
        "CODUFMUN": "170025",
        "SERV_ESP": serv_esp,
        "CLASS_SR": class_sr,
        "AMB_SUS": amb_sus,
        "COMPETEN": "202608",
    }


@pytest.mark.parametrize(
    ("classificacao", "frente"),
    [
        ("001", FrenteDisponibilizacao.CEAF),
        ("002", FrenteDisponibilizacao.FARMACIA_POPULAR_CNES),
        ("004", FrenteDisponibilizacao.CESAF),
        ("005", FrenteDisponibilizacao.CBAF),
        ("006", FrenteDisponibilizacao.FARMACIA_HOSPITALAR),
        ("007", FrenteDisponibilizacao.FARMACIA_VIVA),
    ],
)
def test_classifica_frente_pelo_codigo(classificacao, frente):
    assert classificar_frente(classificacao) == frente


def test_classificacao_desconhecida_falha_explicitamente():
    with pytest.raises(ValueError, match="'099'"):
        classificar_frente("099")


def test_ignora_servicos_que_nao_sao_farmacia():
    servicos = extrair_servicos_farmaceuticos([registro_sr(serv_esp="111", class_sr="001"), registro_sr()])
    assert [servico.frente for servico in servicos] == [FrenteDisponibilizacao.CBAF]


def test_indicador_sus_invalido_falha():
    with pytest.raises(ValueError, match="AMB_SUS"):
        extrair_servicos_farmaceuticos([registro_sr(amb_sus="")])


def test_cbaf_com_atendimento_sus_e_local_de_retirada():
    [servico] = extrair_servicos_farmaceuticos([registro_sr(class_sr="005", amb_sus="1")])
    assert indica_local_de_retirada(servico)


def test_cbaf_sem_atendimento_sus_nao_e_local_de_retirada():
    [servico] = extrair_servicos_farmaceuticos([registro_sr(class_sr="005", amb_sus="0")])
    assert not indica_local_de_retirada(servico)


def test_farmacia_hospitalar_nunca_e_local_de_retirada():
    [servico] = extrair_servicos_farmaceuticos([registro_sr(class_sr="006", amb_sus="1")])
    assert not indica_local_de_retirada(servico)


def test_farmacia_popular_privada_e_local_de_retirada_sem_amb_sus():
    [servico] = extrair_servicos_farmaceuticos([registro_sr(class_sr="002", amb_sus="0")])
    assert indica_local_de_retirada(servico)

