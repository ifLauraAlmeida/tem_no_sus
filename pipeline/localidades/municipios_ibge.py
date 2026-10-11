"""Nomes dos municípios pela API de localidades do IBGE."""

import gzip
import json
import urllib.request
from pathlib import Path

URL_MUNICIPIOS_POR_UF = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/{uf}/municipios"
TEMPO_LIMITE_SEGUNDOS = 60


def indexar_por_codigo_cnes(municipios_ibge: list[dict]) -> dict[str, str]:
    # O CNES usa o código IBGE de 6 dígitos, sem o dígito verificador.
    return {str(municipio["id"])[:6]: municipio["nome"] for municipio in municipios_ibge}


def descompactar_se_gzip(conteudo: bytes) -> bytes:
    # A API do IBGE responde compactada mesmo sem Accept-Encoding: gzip.
    if conteudo[:2] == b"\x1f\x8b":
        return gzip.decompress(conteudo)
    return conteudo


def carregar_municipios(uf: str, diretorio_cache: Path) -> dict[str, str]:
    arquivo_cache = diretorio_cache / f"municipios_{uf}.json"
    if not arquivo_cache.exists():
        url = URL_MUNICIPIOS_POR_UF.format(uf=uf)
        with urllib.request.urlopen(url, timeout=TEMPO_LIMITE_SEGUNDOS) as resposta:
            conteudo = descompactar_se_gzip(resposta.read())
        diretorio_cache.mkdir(parents=True, exist_ok=True)
        arquivo_cache.write_bytes(conteudo)
    return indexar_por_codigo_cnes(json.loads(arquivo_cache.read_text(encoding="utf-8")))
