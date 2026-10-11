import gzip

from pipeline.localidades.municipios_ibge import descompactar_se_gzip, indexar_por_codigo_cnes


def test_indexa_municipios_pelo_codigo_de_seis_digitos():
    municipios = [{"id": 1700251, "nome": "Abreulândia"}, {"id": 1721000, "nome": "Palmas"}]
    assert indexar_por_codigo_cnes(municipios) == {"170025": "Abreulândia", "172100": "Palmas"}


def test_descompacta_resposta_gzip_e_preserva_texto_puro():
    assert descompactar_se_gzip(gzip.compress(b"[]")) == b"[]"
    assert descompactar_se_gzip(b"[]") == b"[]"
