"""Competência (aaaamm) e nomes dos arquivos de disseminação do CNES."""

import re
from dataclasses import dataclass
from typing import Literal

UFS = frozenset(
    "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split()
)
TipoArquivoCnes = Literal["SR", "ST"]
URL_DISSEMINACAO = "ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados"


@dataclass(frozen=True)
class Competencia:
    ano: int
    mes: int

    @classmethod
    def de_texto(cls, competencia: str) -> "Competencia":
        if not re.fullmatch(r"\d{6}", competencia):
            raise ValueError(f"competência inválida: {competencia!r}; esperado formato aaaamm")
        ano, mes = int(competencia[:4]), int(competencia[4:])
        if not 1 <= mes <= 12:
            raise ValueError(f"mês inválido na competência {competencia!r}; esperado 01 a 12")
        return cls(ano, mes)

    def como_texto(self) -> str:
        return f"{self.ano:04d}{self.mes:02d}"


def validar_uf(uf: str) -> str:
    sigla = uf.upper()
    if sigla not in UFS:
        raise ValueError(f"uf inválida: {uf!r}; esperado sigla como 'RJ'")
    return sigla


def nome_arquivo_cnes(tipo: TipoArquivoCnes, uf: str, competencia: Competencia) -> str:
    return f"{tipo}{validar_uf(uf)}{competencia.ano % 100:02d}{competencia.mes:02d}.dbc"


def url_arquivo_cnes(tipo: TipoArquivoCnes, uf: str, competencia: Competencia) -> str:
    return f"{URL_DISSEMINACAO}/{tipo}/{nome_arquivo_cnes(tipo, uf, competencia)}"
