"""Busca nome fantasia, número, CEP e coordenadas das farmácias pelo CNPJ na base completa do CNES.

A lista oficial do Farmácia Popular traz só logradouro e bairro; a base
completa do CNES (tbEstabelecimento) tem o número do endereço e as coordenadas.
"""

import csv
import io
import zipfile
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

COLUNAS_TB_ESTABELECIMENTO = ("CO_CNES", "NU_CNPJ", "NO_FANTASIA", "NU_ENDERECO", "CO_CEP", "NU_LATITUDE", "NU_LONGITUDE", "CO_MOTIVO_DESAB")


@dataclass(frozen=True)
class LocalizacaoCnes:
    cnes: str
    nome_fantasia: str | None
    numero: str | None
    cep: str | None
    latitude: float | None
    longitude: float | None


def converter_coordenada(valor: str) -> float | None:
    texto = (valor or "").strip().replace(",", ".")
    if not texto:
        return None
    try:
        return float(texto)
    except ValueError as erro:
        raise ValueError(f"coordenada inválida no CNES: {valor!r}; esperado número decimal") from erro


def coordenada_plausivel(latitude: float | None, longitude: float | None) -> bool:
    # Limites aproximados do território brasileiro; fora disso o dado
    # de geolocalização do CNES está errado (ex.: 0,0 ou sinal trocado).
    if latitude is None or longitude is None:
        return False
    return -34.0 <= latitude <= 5.5 and -74.0 <= longitude <= -32.0


def converter_registro(registro: dict[str, str]) -> LocalizacaoCnes:
    latitude = converter_coordenada(registro["NU_LATITUDE"])
    longitude = converter_coordenada(registro["NU_LONGITUDE"])
    if not coordenada_plausivel(latitude, longitude):
        latitude = longitude = None
    return LocalizacaoCnes(
        cnes=registro["CO_CNES"],
        nome_fantasia=(registro["NO_FANTASIA"] or "").strip() or None,
        numero=(registro["NU_ENDERECO"] or "").strip() or None,
        cep=(registro["CO_CEP"] or "").strip() or None,
        latitude=latitude,
        longitude=longitude,
    )


def escolher_localizacao(candidatos: list[dict[str, str]]) -> LocalizacaoCnes:
    # Um CNPJ pode ter cadastros antigos desativados; prefere o ativo e com coordenada.
    ativos = [registro for registro in candidatos if not (registro["CO_MOTIVO_DESAB"] or "").strip()] or candidatos
    localizacoes = [converter_registro(registro) for registro in ativos]
    com_coordenada = [local for local in localizacoes if local.latitude is not None]
    return (com_coordenada or localizacoes)[0]


def indexar_por_cnpj(registros: Iterable[dict[str, str]], cnpjs: set[str]) -> dict[str, LocalizacaoCnes]:
    candidatos: dict[str, list[dict[str, str]]] = {}
    for registro in registros:
        cnpj = (registro["NU_CNPJ"] or "").strip()
        if cnpj in cnpjs:
            candidatos.setdefault(cnpj, []).append(registro)
    return {cnpj: escolher_localizacao(lista) for cnpj, lista in candidatos.items()}


def ler_tb_estabelecimento(caminho_zip: Path) -> Iterable[dict[str, str]]:
    with zipfile.ZipFile(caminho_zip) as arquivo_zip:
        nome = next(nome for nome in arquivo_zip.namelist() if nome.startswith("tbEstabelecimento2"))
        with arquivo_zip.open(nome) as bruto:
            leitor = csv.DictReader(io.TextIOWrapper(bruto, encoding="latin-1", newline=""), delimiter=";")
            ausentes = set(COLUNAS_TB_ESTABELECIMENTO) - set(leitor.fieldnames or [])
            if ausentes:
                raise ValueError(f"{nome}: colunas ausentes {sorted(ausentes)}; verifique o layout da base do CNES")
            yield from leitor
