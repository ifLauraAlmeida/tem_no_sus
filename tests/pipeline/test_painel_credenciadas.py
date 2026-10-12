import pytest

from pipeline.farmacia_popular.painel_credenciadas import PainelIndisponivelError, converter_linha, validar_total

LINHA = ["14585421000136", "DROGARIA X - ME ", "MAL RONDON", "CENTRO", "261360", "São José do Egito", "PE", "19/11/2014"]


def test_converte_linha_do_painel():
    farmacia = converter_linha(LINHA)
    assert farmacia.cnpj == "14585421000136"
    assert farmacia.nome == "DROGARIA X - ME"
    assert farmacia.codigo_municipio == "261360"


def test_cnpj_invalido_falha():
    with pytest.raises(ValueError, match="'123'"):
        converter_linha(["123", *LINHA[1:]])


def test_leitura_incompleta_falha():
    with pytest.raises(PainelIndisponivelError, match="1 de 2"):
        validar_total({"total": 2, "linhas": [LINHA]})
