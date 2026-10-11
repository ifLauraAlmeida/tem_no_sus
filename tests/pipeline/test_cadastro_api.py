import pytest

from pipeline.cnes.cadastro_api import converter_cadastro

RESPOSTA_API = {
    "codigo_cnes": 554852,
    "nome_fantasia": "UNIDADE BASICA DE SAUDE JOAO BATISTA DE FRANCA ",
    "nome_razao_social": "PREFEITURA MUNICIPAL DE ABREULANDIA",
    "endereco_estabelecimento": "AV JOAO FRANCISCO DE ABREU",
    "numero_estabelecimento": "S/N",
    "bairro_estabelecimento": "CENTRO",
    "codigo_cep_estabelecimento": "77693000",
    "latitude_estabelecimento_decimo_grau": -9.62,
    "longitude_estabelecimento_decimo_grau": -49.16,
    "data_atualizacao": "2026-09-01",
}


def test_converte_resposta_da_api_e_completa_cnes_com_zeros():
    cadastro = converter_cadastro(RESPOSTA_API)
    assert cadastro.cnes == "0554852"
    assert cadastro.nome == "UNIDADE BASICA DE SAUDE JOAO BATISTA DE FRANCA"
    assert (cadastro.latitude, cadastro.longitude) == (-9.62, -49.16)


def test_usa_razao_social_quando_nao_ha_nome_fantasia():
    cadastro = converter_cadastro({**RESPOSTA_API, "nome_fantasia": None})
    assert cadastro.nome == "PREFEITURA MUNICIPAL DE ABREULANDIA"


def test_coordenada_ausente_permanece_nula():
    cadastro = converter_cadastro({**RESPOSTA_API, "latitude_estabelecimento_decimo_grau": None})
    assert cadastro.latitude is None


def test_cadastro_sem_nome_falha():
    with pytest.raises(ValueError, match="554852"):
        converter_cadastro({**RESPOSTA_API, "nome_fantasia": None, "nome_razao_social": ""})
