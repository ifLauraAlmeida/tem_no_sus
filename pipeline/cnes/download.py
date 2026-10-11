"""Download idempotente dos arquivos do CNES, preservando o original e seu hash."""

import hashlib
import json
import logging
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from pipeline.cnes.competencia import Competencia, TipoArquivoCnes, nome_arquivo_cnes, url_arquivo_cnes

logger = logging.getLogger(__name__)
TEMPO_LIMITE_SEGUNDOS = 120


def diretorio_bruto(raiz: Path, tipo: TipoArquivoCnes, uf: str, competencia: Competencia) -> Path:
    return raiz / "cnes" / tipo.lower() / f"ano={competencia.ano}" / f"mes={competencia.mes:02d}" / f"uf={uf}"


def calcular_sha256(caminho: Path) -> str:
    return hashlib.sha256(caminho.read_bytes()).hexdigest()


def baixar_arquivo_cnes(raiz: Path, tipo: TipoArquivoCnes, uf: str, competencia: Competencia) -> Path:
    destino = diretorio_bruto(raiz, tipo, uf, competencia) / nome_arquivo_cnes(tipo, uf, competencia)
    if destino.exists():
        logger.info("arquivo já baixado, reaproveitando: %s", destino)
        return destino

    url = url_arquivo_cnes(tipo, uf, competencia)
    destino.parent.mkdir(parents=True, exist_ok=True)
    logger.info("baixando %s", url)
    temporario = destino.with_suffix(".parcial")
    with urllib.request.urlopen(url, timeout=TEMPO_LIMITE_SEGUNDOS) as resposta:
        temporario.write_bytes(resposta.read())
    # Renomeia só após o download completo para que uma falha no meio
    # não deixe um arquivo truncado ser reaproveitado na próxima execução.
    temporario.rename(destino)
    registrar_metadados(destino, url)
    return destino


def registrar_metadados(arquivo: Path, url: str) -> None:
    metadados = {
        "url": url,
        "sha256": calcular_sha256(arquivo),
        "tamanho_bytes": arquivo.stat().st_size,
        "obtido_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    arquivo.with_suffix(".metadados.json").write_text(json.dumps(metadados, indent=2), encoding="utf-8")
