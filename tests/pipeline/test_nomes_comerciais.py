from pipeline.anvisa.nomes_comerciais import componentes_do_principio, relacionar_nomes

TERMOS = frozenset({"salbutamol", "dipirona", "losartana", "losartana potassica", "cafeina_ausente"})


def registro(nome, principio, categoria="Novo"):
    return {"NOME_PRODUTO": nome, "PRINCIPIO_ATIVO": principio, "CATEGORIA_REGULATORIA": categoria}


def test_limpa_qualificadores_fisicos_e_entidades_html():
    assert componentes_do_principio("solucao de salbutamol, sulfato de salbutamol micronizado") == [
        "salbutamol",
        "sulfato de salbutamol",
    ]
    assert componentes_do_principio("dipirona monoidratada") == ["dipirona"]
    assert componentes_do_principio("losartana pot&#225;ssica") == ["losartana potassica"]


def test_marca_de_principio_unico_e_associada():
    nomes = relacionar_nomes([registro("AEROLIN", "solucao de salbutamol, sulfato de salbutamol")], TERMOS)
    assert nomes == {"aerolin": ["salbutamol"]}


def test_associacao_com_componente_fora_das_listas_e_descartada():
    nomes = relacionar_nomes([registro("NOVALGINA FLASH", "dipirona monoidratada, cafeína anidra")], TERMOS)
    assert nomes == {}


def test_marca_com_registros_divergentes_e_descartada():
    registros = [registro("XAROPAO", "dipirona"), registro("XAROPAO", "losartana potássica")]
    assert relacionar_nomes(registros, TERMOS) == {}


def test_varios_registros_da_mesma_marca_e_mesmo_principio_sao_unidos():
    registros = [registro("NOVALGINA", "dipirona, dipirona monoidratada"), registro("NOVALGINA", "dipirona monoidratada")]
    assert relacionar_nomes(registros, TERMOS) == {"novalgina": ["dipirona"]}


def test_genericos_e_nomes_iguais_ao_principio_sao_ignorados():
    registros = [registro("LOSARTANA", "losartana potássica", categoria="Genérico"), registro("DIPIRONA", "dipirona", categoria="Similar")]
    assert relacionar_nomes(registros, TERMOS) == {}
