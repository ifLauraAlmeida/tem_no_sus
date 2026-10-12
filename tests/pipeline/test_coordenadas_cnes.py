import pytest

from pipeline.farmacia_popular.coordenadas_cnes import converter_coordenada, indexar_por_cnpj


def registro(cnpj, cnes, latitude="-10,18", longitude="-48,33", motivo="", numero="100"):
    return {"CO_CNES": cnes, "NU_CNPJ": cnpj, "NU_ENDERECO": numero, "CO_CEP": "77001002",
            "NU_LATITUDE": latitude, "NU_LONGITUDE": longitude, "CO_MOTIVO_DESAB": motivo}


def test_converte_coordenada_com_virgula_e_vazio():
    assert converter_coordenada("-10,18") == -10.18
    assert converter_coordenada("") is None


def test_coordenada_nao_numerica_falha():
    with pytest.raises(ValueError, match="'abc'"):
        converter_coordenada("abc")


def test_indexa_apenas_cnpjs_procurados():
    indice = indexar_por_cnpj([registro("1", "A"), registro("2", "B")], {"2"})
    assert list(indice) == ["2"]
    assert indice["2"].numero == "100"


def test_prefere_cadastro_ativo_e_com_coordenada():
    registros = [
        registro("1", "DESATIVADO", motivo="01"),
        registro("1", "SEM_COORD", latitude="", longitude=""),
        registro("1", "BOM"),
    ]
    assert indexar_por_cnpj(registros, {"1"})["1"].cnes == "BOM"


def test_descarta_coordenada_fora_do_brasil():
    indice = indexar_por_cnpj([registro("1", "A", latitude="0", longitude="0")], {"1"})
    assert indice["1"].latitude is None
