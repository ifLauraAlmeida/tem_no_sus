"""Extrai o Anexo I (Componente Básico) da RENAME 2024 para JSON.

Uso: python -m pipeline.rename.componente_basico --pdf caminho/rename2024.pdf
"""

import argparse
import json
import logging
import re
from collections.abc import Iterable
from datetime import date
from pathlib import Path

import pdfplumber

from pipeline.cnes.download import calcular_sha256
from pipeline.rename.termos_busca import derivar_termos_busca

logger = logging.getLogger(__name__)

URL_RENAME_2024 = "https://bvsms.saude.gov.br/bvs/publicacoes/relacao_nacional_medicamentos_2024_2ed.pdf"
TITULO_ANEXO_I = "ANEXO I – Relação Nacional"
TITULO_ANEXO_II = "ANEXO II – Relação Nacional"
CABECALHO_TABELA = "Denominação Comum"
SAIDA_PADRAO = Path("data/reference/rename_2024_componente_basico.json")

LinhaTabela = list[str | None]


def limpar_celula(celula: str | None) -> str | None:
    if celula is None:
        return None
    return re.sub(r"\s+", " ", celula.replace("​", "")).strip() or None


def localizar_paginas_anexo_i(textos_paginas: list[str]) -> range:
    # A primeira ocorrência do título está no sumário; o anexo é a página
    # cujo texto traz o título e também uma tabela de medicamentos.
    inicio = next(
        indice for indice, texto in enumerate(textos_paginas)
        if TITULO_ANEXO_I in texto and CABECALHO_TABELA in texto
    )
    fim = next(indice for indice in range(inicio + 1, len(textos_paginas)) if TITULO_ANEXO_II in textos_paginas[indice])
    return range(inicio, fim)


# A DCB aparece só na primeira linha de cada medicamento, inclusive quando
# a tabela continua na página seguinte; por isso o nome é propagado.
def converter_linhas(linhas: Iterable[LinhaTabela]) -> list[dict[str, str]]:
    itens = []
    denominacao_atual = None
    for linha in linhas:
        denominacao, concentracao, forma = (limpar_celula(celula) for celula in linha[:3])
        if denominacao and denominacao.startswith(CABECALHO_TABELA):
            continue
        denominacao_atual = denominacao or denominacao_atual
        if denominacao_atual is None or forma is None:
            raise ValueError(f"linha do anexo I sem denominação ou forma farmacêutica: {linha!r}")
        itens.append({"denominacao": denominacao_atual, "concentracao": concentracao, "forma_farmaceutica": forma})
    return itens


def montar_item(indice: int, linha: dict[str, str]) -> dict:
    concentracao = None if linha["concentracao"] in (None, "-") else linha["concentracao"]
    partes = [linha["denominacao"], concentracao, linha["forma_farmaceutica"]]
    return {
        "id": f"rename-cbaf-{indice:04d}",
        "descricao_original": " — ".join(parte for parte in partes if parte),
        "principio_ativo": linha["denominacao"],
        "concentracao": concentracao,
        "forma_farmaceutica": linha["forma_farmaceutica"],
        "termos_busca": derivar_termos_busca(linha["denominacao"]),
    }


def extrair_linhas_pdf(caminho_pdf: Path) -> list[LinhaTabela]:
    with pdfplumber.open(caminho_pdf) as pdf:
        textos = [pagina.extract_text() or "" for pagina in pdf.pages]
        paginas = localizar_paginas_anexo_i(textos)
        logger.info("anexo I nas páginas %d a %d", paginas.start + 1, paginas.stop)
        return [linha for indice in paginas for tabela in pdf.pages[indice].extract_tables() for linha in tabela]


def gerar_componente_basico(caminho_pdf: Path, saida: Path) -> None:
    linhas = converter_linhas(extrair_linhas_pdf(caminho_pdf))
    itens = [montar_item(indice, linha) for indice, linha in enumerate(linhas, start=1)]
    conteudo = {
        "fonte": {
            "programa": "Componente Básico da Assistência Farmacêutica",
            "orgao": "Ministério da Saúde",
            "documento": "RENAME 2024 — Anexo I",
            "url": URL_RENAME_2024,
            "sha256": calcular_sha256(caminho_pdf),
            "data_obtencao": date.today().isoformat(),
        },
        "itens": itens,
    }
    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_text(json.dumps(conteudo, ensure_ascii=False, indent=1), encoding="utf-8")
    logger.info("gravado %s com %d apresentações", saida, len(itens))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path, required=True)
    parser.add_argument("--saida", type=Path, default=SAIDA_PADRAO)
    argumentos = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    gerar_componente_basico(argumentos.pdf, argumentos.saida)


if __name__ == "__main__":
    main()
