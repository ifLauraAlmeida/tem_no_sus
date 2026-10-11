import pytest

from pipeline.cnes.leitura_dbc import SchemaInvalidoError, validar_colunas


def test_schema_sem_coluna_esperada_falha_com_nome_da_coluna():
    with pytest.raises(SchemaInvalidoError, match="AMB_SUS"):
        validar_colunas(["CNES", "SERV_ESP"], ["CNES", "SERV_ESP", "AMB_SUS"], "SRTO2608.dbc")


def test_schema_com_colunas_extras_e_aceito():
    validar_colunas(["CNES", "SERV_ESP", "NOVA"], ["CNES", "SERV_ESP"], "SRTO2608.dbc")
