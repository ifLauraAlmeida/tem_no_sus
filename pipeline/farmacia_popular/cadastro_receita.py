"""Nome fantasia e endereço completo das farmácias pelos dados abertos de CNPJ da Receita Federal.

Os arquivos Estabelecimentos{0-9}.zip trazem um CSV sem cabeçalho, separado
por ";", em latin-1, com 30 colunas por estabelecimento.
"""

import csv
import io
import zipfile
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

URL_COMPARTILHAMENTO_RECEITA = "https://arquivos.receitafederal.gov.br/public.php/dav/files/YggdBLfdninEJX9"
TOTAL_COLUNAS = 30
COLUNA = {
    "cnpj_basico": 0, "cnpj_ordem": 1, "cnpj_dv": 2, "nome_fantasia": 4, "tipo_logradouro": 13,
    "logradouro": 14, "numero": 15, "complemento": 16, "bairro": 17, "cep": 18,
}


@dataclass(frozen=True)
class CadastroReceita:
    cnpj: str
    nome_fantasia: str | None
    logradouro: str | None
    numero: str | None
    bairro: str | None
    cep: str | None


def texto_ou_nulo(valor: str) -> str | None:
    texto = " ".join(valor.split())
    return texto or None


def converter_linha(linha: list[str]) -> CadastroReceita:
    if len(linha) != TOTAL_COLUNAS:
        raise ValueError(f"linha da receita com {len(linha)} colunas; esperado {TOTAL_COLUNAS}: {linha[:3]!r}")
    campo = lambda nome: linha[COLUNA[nome]]  # noqa: E731
    logradouro = " ".join(filter(None, (texto_ou_nulo(campo("tipo_logradouro")), texto_ou_nulo(campo("logradouro")))))
    numero = texto_ou_nulo(campo("numero"))
    return CadastroReceita(
        cnpj=campo("cnpj_basico") + campo("cnpj_ordem") + campo("cnpj_dv"),
        nome_fantasia=texto_ou_nulo(campo("nome_fantasia")),
        logradouro=logradouro or None,
        # A Receita usa "S/N" e "SN" para endereço sem número.
        numero=None if numero in {"S/N", "SN", "S N"} else numero,
        bairro=texto_ou_nulo(campo("bairro")),
        cep=texto_ou_nulo(campo("cep")),
    )


def ler_linhas_receita(caminhos_zip: Iterable[Path]) -> Iterable[list[str]]:
    for caminho in caminhos_zip:
        with zipfile.ZipFile(caminho) as arquivo_zip:
            for nome in arquivo_zip.namelist():
                with arquivo_zip.open(nome) as bruto:
                    yield from csv.reader(io.TextIOWrapper(bruto, encoding="latin-1", newline=""), delimiter=";")


def indexar_por_cnpj(linhas: Iterable[list[str]], cnpjs: set[str]) -> dict[str, CadastroReceita]:
    basicos = {cnpj[:8] for cnpj in cnpjs}
    indice = {}
    for linha in linhas:
        # Filtra pelo CNPJ básico antes de converter: são ~60 milhões de linhas.
        if not linha or linha[0] not in basicos:
            continue
        cadastro = converter_linha(linha)
        if cadastro.cnpj in cnpjs:
            indice[cadastro.cnpj] = cadastro
    return indice
