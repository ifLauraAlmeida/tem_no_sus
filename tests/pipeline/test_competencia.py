import pytest

from pipeline.cnes.competencia import Competencia, nome_arquivo_cnes, url_arquivo_cnes, validar_uf


def test_converte_competencia_valida():
    assert Competencia.de_texto("202608") == Competencia(2026, 8)
    assert Competencia(2026, 8).como_texto() == "202608"


@pytest.mark.parametrize("texto", ["2026-08", "20268", "202613", "202600", "abcdef"])
def test_rejeita_competencia_invalida(texto):
    with pytest.raises(ValueError, match=repr(texto)):
        Competencia.de_texto(texto)


def test_nome_do_arquivo_segue_padrao_tipo_uf_ano_mes():
    assert nome_arquivo_cnes("SR", "rj", Competencia(2026, 8)) == "SRRJ2608.dbc"


def test_url_aponta_para_diretorio_do_tipo():
    url = url_arquivo_cnes("ST", "TO", Competencia(2026, 1))
    assert url.endswith("/CNES/200508_/Dados/ST/STTO2601.dbc")


def test_rejeita_uf_inexistente():
    with pytest.raises(ValueError, match="'XX'"):
        validar_uf("XX")
