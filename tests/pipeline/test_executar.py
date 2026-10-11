import json

from pipeline.cnes.competencia import Competencia
from pipeline.cnes.executar import atualizar_indice


def test_indice_acumula_ufs_e_substitui_competencia(tmp_path):
    atualizar_indice(tmp_path, "TO", Competencia(2026, 7), 60)
    atualizar_indice(tmp_path, "RJ", Competencia(2026, 8), 900)
    atualizar_indice(tmp_path, "TO", Competencia(2026, 8), 64)
    indice = json.loads((tmp_path / "indice.json").read_text(encoding="utf-8"))
    assert indice["ufs"] == {
        "RJ": {"competencia_cnes": "202608", "estabelecimentos": 900},
        "TO": {"competencia_cnes": "202608", "estabelecimentos": 64},
    }
