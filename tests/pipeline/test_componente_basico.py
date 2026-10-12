import pytest

from pipeline.rename.componente_basico import converter_linhas, localizar_paginas_anexo_i, montar_item


def test_ignora_cabecalho_e_propaga_denominacao_entre_linhas_e_paginas():
    linhas = [
        ["Denominação Comum\nBrasileira (DCB)", "Concentração/Composição", "Forma Farmacêutica"],
        ["acetato de\nmedroxiprogesterona", "50 mg/mL", "suspensão injetável"],
        [None, "10 mg", "comprimido"],
        ["Denominação Comum\nBrasileira (DCB)", "Concentração/Composição", "Forma Farmacêutica"],
        [None, "150 mg/mL", "suspensão injetável"],
    ]
    itens = converter_linhas(linhas)
    assert [item["denominacao"] for item in itens] == ["acetato de medroxiprogesterona"] * 3
    assert [item["concentracao"] for item in itens] == ["50 mg/mL", "10 mg", "150 mg/mL"]


def test_linha_sem_forma_farmaceutica_falha():
    with pytest.raises(ValueError, match="forma farmacêutica"):
        converter_linhas([["atenolol", "50 mg", None]])


def test_localiza_anexo_ignorando_sumario():
    textos = [
        "Sumário ANEXO I – Relação Nacional ... 133",
        "introdução",
        "ANEXO I – Relação Nacional de Medicamentos Denominação Comum Brasileira",
        "continuação Denominação Comum",
        "ANEXO II – Relação Nacional",
    ]
    assert localizar_paginas_anexo_i(textos) == range(2, 4)


def test_concentracao_com_traco_vira_nula_e_monta_descricao():
    item = montar_item(7, {"denominacao": "óleo mineral", "concentracao": "-", "forma_farmaceutica": "óleo para uso oral"})
    assert item["id"] == "rename-cbaf-0007"
    assert item["concentracao"] is None
    assert item["descricao_original"] == "óleo mineral — óleo para uso oral"
