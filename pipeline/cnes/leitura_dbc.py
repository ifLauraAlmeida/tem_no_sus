"""Leitura dos arquivos .dbc do DATASUS com validação das colunas esperadas."""

import tempfile
from collections.abc import Iterable
from pathlib import Path

import dbfread
import pyreaddbc

# Os arquivos de disseminação do CNES são gravados em latin-1.
CODIFICACAO_DATASUS = "latin-1"


class SchemaInvalidoError(ValueError):
    """Arquivo da fonte sem colunas exigidas pelo pipeline (falha de qualidade de dados)."""


def validar_colunas(colunas_encontradas: Iterable[str], colunas_esperadas: Iterable[str], origem: str) -> None:
    ausentes = sorted(set(colunas_esperadas) - set(colunas_encontradas))
    if ausentes:
        raise SchemaInvalidoError(f"{origem}: colunas ausentes {ausentes}; verifique o layout da competência")


def ler_registros_dbc(caminho_dbc: Path, colunas_esperadas: tuple[str, ...]) -> list[dict[str, str]]:
    with tempfile.TemporaryDirectory() as diretorio_temporario:
        caminho_dbf = Path(diretorio_temporario) / caminho_dbc.with_suffix(".dbf").name
        pyreaddbc.dbc2dbf(str(caminho_dbc), str(caminho_dbf))
        tabela = dbfread.DBF(str(caminho_dbf), encoding=CODIFICACAO_DATASUS)
        validar_colunas(tabela.field_names, colunas_esperadas, caminho_dbc.name)
        return [{coluna: registro[coluna] for coluna in colunas_esperadas} for registro in tabela]
