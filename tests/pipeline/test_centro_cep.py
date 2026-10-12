from collections import defaultdict

from pipeline.localidades.centro_cep import AcumuladorCep, acumular_centros, agrupar_por_prefixo


def registro(cep, latitude, longitude, nivel="1"):
    return {"CEP": cep, "LATITUDE": str(latitude), "LONGITUDE": str(longitude), "NV_GEO_COORD": nivel}


def acumular(registros):
    acumuladores = defaultdict(AcumuladorCep)
    acumular_centros(registros, acumuladores)
    return acumuladores


def test_centro_e_a_media_das_coordenadas_do_cep():
    acumuladores = acumular([registro("77001002", -10.0, -48.0), registro("77001002", -10.2, -48.4)])
    assert acumuladores["77001002"].centro() == [-10.1, -48.2, 2]


def test_ignora_coordenadas_de_localidade_e_setor():
    acumuladores = acumular([registro("77001002", -10.0, -48.0), registro("77001002", -15.0, -50.0, nivel="5"), registro("77001002", -15.0, -50.0, nivel="6")])
    assert acumuladores["77001002"].centro() == [-10.0, -48.0, 1]


def test_ignora_cep_invalido():
    assert dict(acumular([registro("", -10, -48), registro("7700100", -10, -48)])) == {}


def test_agrupa_por_tres_primeiros_digitos():
    acumuladores = acumular([registro("77001002", -10, -48), registro("77020016", -10.1, -48.1), registro("20520054", -22.9, -43.2)])
    por_prefixo = agrupar_por_prefixo(acumuladores)
    assert sorted(por_prefixo) == ["205", "770"]
    assert sorted(por_prefixo["770"]) == ["77001002", "77020016"]


def test_consulta_centro_gerado_e_cep_ausente(tmp_path):
    from pipeline.localidades.centro_cep import CentrosCep, gravar

    gravar({"770": {"77001002": [-10.1, -48.2, 2]}}, tmp_path)
    centros = CentrosCep(tmp_path)
    assert centros.centro("77001002") == (-10.1, -48.2)
    assert centros.centro("77999999") is None
    assert centros.centro("20520054") is None
    assert centros.centro(None) is None
