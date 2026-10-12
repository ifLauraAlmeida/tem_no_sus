import pytest

from pipeline.farmacia_popular.cadastro_receita import converter_linha, indexar_por_cnpj


def linha_receita(basico="12345678", ordem="0001", dv="90", fantasia="DROGASMIL", numero="40"):
    linha = [""] * 30
    linha[0], linha[1], linha[2], linha[4] = basico, ordem, dv, fantasia
    linha[13], linha[14], linha[15], linha[17], linha[18] = "RUA", "CONDE  DE BONFIM", numero, "TIJUCA", "20520053"
    return linha


def test_converte_linha_com_tipo_de_logradouro():
    cadastro = converter_linha(linha_receita())
    assert cadastro.cnpj == "12345678000190"
    assert cadastro.nome_fantasia == "DROGASMIL"
    assert cadastro.logradouro == "RUA CONDE DE BONFIM"
    assert (cadastro.numero, cadastro.cep) == ("40", "20520053")


def test_sem_numero_e_nome_fantasia_vazio_viram_nulos():
    cadastro = converter_linha(linha_receita(fantasia="  ", numero="S/N"))
    assert cadastro.nome_fantasia is None
    assert cadastro.numero is None


def test_linha_com_numero_errado_de_colunas_falha():
    with pytest.raises(ValueError, match="29 colunas"):
        converter_linha([""] * 29)


def test_indexa_so_os_cnpjs_procurados_incluindo_filial_certa():
    linhas = [linha_receita(ordem="0001", dv="90"), linha_receita(ordem="0002", dv="71", fantasia="FILIAL"), linha_receita(basico="99999999")]
    indice = indexar_por_cnpj(linhas, {"12345678000271"})
    assert list(indice) == ["12345678000271"]
    assert indice["12345678000271"].nome_fantasia == "FILIAL"
