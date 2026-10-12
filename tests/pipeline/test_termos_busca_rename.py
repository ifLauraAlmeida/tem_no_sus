import pytest

from pipeline.rename.termos_busca import derivar_termos_busca


@pytest.mark.parametrize(
    ("denominacao", "esperados"),
    [
        ("losartana potássica", ["losartana potassica", "losartana"]),
        ("cloridrato de metformina", ["cloridrato de metformina", "metformina"]),
        ("alendronato de sódio", ["alendronato de sodio", "alendronato"]),
        ("acetato de hidrocortisona", ["acetato de hidrocortisona", "hidrocortisona"]),
        ("sinvastatina", ["sinvastatina"]),
    ],
)
def test_remove_sal_do_principio_ativo(denominacao, esperados):
    assert derivar_termos_busca(denominacao) == esperados


def test_nao_reduz_sal_a_um_ion():
    assert derivar_termos_busca("acetato de sódio") == ["acetato de sodio"]
    assert derivar_termos_busca("cloreto de sódio") == ["cloreto de sodio"]


def test_associacao_gera_termos_de_cada_componente():
    assert derivar_termos_busca("amoxicilina + clavulanato de potássio") == [
        "amoxicilina",
        "clavulanato de potassio",
        "clavulanato",
    ]


def test_remove_anotacoes_entre_parenteses():
    assert derivar_termos_busca("alcachofra (Cynara scolymus L.)") == ["alcachofra"]
    assert derivar_termos_busca("ácido salicílico (FN)") == ["acido salicilico"]
