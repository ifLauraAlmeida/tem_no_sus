from pipeline.farmacia_popular.cadastro_receita import CadastroReceita
from pipeline.farmacia_popular.coordenadas_cnes import LocalizacaoCnes
from pipeline.farmacia_popular.executar import agrupar_por_uf
from pipeline.farmacia_popular.painel_credenciadas import FarmaciaCredenciada


def farmacia(cnpj, uf="TO", nome="DROGARIA"):
    return FarmaciaCredenciada(cnpj, nome, "AV JK", "CENTRO", "172100", "Palmas", uf, "01/01/2020")


def test_agrupa_por_uf_e_completa_com_localizacao_do_cnes():
    localizacoes = {"1": LocalizacaoCnes("123", "DROGASMIL", "500", "77001002", -10.18, -48.33)}
    por_uf = agrupar_por_uf([farmacia("1"), farmacia("2", uf="RJ")], localizacoes, {})
    assert sorted(por_uf) == ["RJ", "TO"]
    [palmas] = por_uf["TO"]
    assert palmas["endereco"]["numero"] == "500"
    assert (palmas["nome"], palmas["razao_social"]) == ("DROGASMIL", "DROGARIA")
    assert (palmas["latitude"], palmas["frentes"]) == (-10.18, ["FARMACIA_POPULAR"])


def test_farmacia_sem_cnes_fica_sem_coordenada_mas_nao_e_descartada():
    [rio] = agrupar_por_uf([farmacia("2", uf="RJ")], {}, {})["RJ"]
    assert rio["latitude"] is None
    assert rio["nome"] == rio["razao_social"] == "DROGARIA"
    assert rio["endereco"]["bairro"] == "CENTRO"


def test_receita_tem_prioridade_no_nome_fantasia_e_endereco():
    localizacoes = {"1": LocalizacaoCnes("123", "NOME CNES", "500", "77001002", -10.18, -48.33)}
    receita = {"1": CadastroReceita("1", "DROGASMIL", "AVENIDA JK", "510", "CENTRO", "77001003")}
    [palmas] = agrupar_por_uf([farmacia("1")], localizacoes, receita)["TO"]
    assert palmas["nome"] == "DROGASMIL"
    assert palmas["endereco"] == {"logradouro": "AVENIDA JK", "numero": "510", "bairro": "CENTRO", "cep": "77001003"}
    assert palmas["latitude"] == -10.18


def test_sem_nome_fantasia_na_receita_usa_o_do_cnes():
    localizacoes = {"1": LocalizacaoCnes("123", "NOME CNES", None, None, None, None)}
    receita = {"1": CadastroReceita("1", None, None, None, None, None)}
    [palmas] = agrupar_por_uf([farmacia("1")], localizacoes, receita)["TO"]
    assert palmas["nome"] == "NOME CNES"
    assert palmas["endereco"]["logradouro"] == "AV JK"
