"""Centro geográfico de cada CEP a partir do CNEFE (IBGE, Censo 2022).

Uso: python -m pipeline.localidades.centro_cep --dir-cnefe data/raw/ibge/cnefe/completo

O centro é a média das coordenadas dos endereços do CEP. Só entram níveis de
coordenada precisos (1 a 4: endereço original, ajustado, estimado ou face de
quadra); localidade (5) e setor censitário (6) deslocariam o centro.
Saída: data/processed/cep/{3 primeiros dígitos}.json, para o navegador baixar
só o arquivo do CEP consultado.
"""

import argparse
import csv
import io
import json
import logging
import zipfile
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

URL_CNEFE = (
    "https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/"
    "Censo_Demografico_2022/Arquivos_CNEFE/CSV/UF/"
)
NIVEIS_PRECISOS = frozenset({"1", "2", "3", "4"})
COLUNAS_CNEFE = ("CEP", "LATITUDE", "LONGITUDE", "NV_GEO_COORD")
CASAS_DECIMAIS = 5  # ~1 m; suficiente para uma estimativa por CEP
DIRETORIO_SAIDA = Path("data/processed/cep")


@dataclass
class AcumuladorCep:
    soma_latitude: float = 0.0
    soma_longitude: float = 0.0
    enderecos: int = 0

    def adicionar(self, latitude: float, longitude: float) -> None:
        self.soma_latitude += latitude
        self.soma_longitude += longitude
        self.enderecos += 1

    def centro(self) -> list[float | int]:
        return [
            round(self.soma_latitude / self.enderecos, CASAS_DECIMAIS),
            round(self.soma_longitude / self.enderecos, CASAS_DECIMAIS),
            self.enderecos,
        ]


def ler_registros_cnefe(caminho_zip: Path) -> Iterable[dict[str, str]]:
    with zipfile.ZipFile(caminho_zip) as arquivo_zip:
        [nome] = [nome for nome in arquivo_zip.namelist() if nome.endswith(".csv")]
        with arquivo_zip.open(nome) as bruto:
            leitor = csv.DictReader(io.TextIOWrapper(bruto, encoding="latin-1", newline=""), delimiter=";")
            ausentes = set(COLUNAS_CNEFE) - set(leitor.fieldnames or [])
            if ausentes:
                raise ValueError(f"{caminho_zip.name}: colunas ausentes {sorted(ausentes)}; verifique o layout do CNEFE")
            yield from leitor


def acumular_centros(registros: Iterable[dict[str, str]], acumuladores: dict[str, AcumuladorCep]) -> None:
    for registro in registros:
        cep = registro["CEP"]
        if registro["NV_GEO_COORD"] not in NIVEIS_PRECISOS or len(cep) != 8 or not cep.isdigit():
            continue
        acumuladores[cep].adicionar(float(registro["LATITUDE"]), float(registro["LONGITUDE"]))


def agrupar_por_prefixo(acumuladores: dict[str, AcumuladorCep]) -> dict[str, dict[str, list]]:
    por_prefixo: dict[str, dict[str, list]] = defaultdict(dict)
    for cep in sorted(acumuladores):
        por_prefixo[cep[:3]][cep] = acumuladores[cep].centro()
    return dict(por_prefixo)


def gravar(por_prefixo: dict[str, dict[str, list]], diretorio: Path) -> None:
    diretorio.mkdir(parents=True, exist_ok=True)
    for prefixo, centros in por_prefixo.items():
        conteudo = json.dumps(centros, separators=(",", ":"))
        (diretorio / f"{prefixo}.json").write_text(conteudo, encoding="utf-8")


def gerar_centros_cep(diretorio_cnefe: Path, diretorio_saida: Path = DIRETORIO_SAIDA) -> None:
    arquivos = sorted(diretorio_cnefe.glob("[0-9][0-9]_[A-Z][A-Z].zip"))
    if len(arquivos) != 27:
        raise FileNotFoundError(f"esperados 27 arquivos do CNEFE por UF em {diretorio_cnefe}; encontrados {len(arquivos)}")
    acumuladores: dict[str, AcumuladorCep] = defaultdict(AcumuladorCep)
    for arquivo in arquivos:
        acumular_centros(ler_registros_cnefe(arquivo), acumuladores)
        logger.info("%s lido; %d CEPs acumulados", arquivo.name, len(acumuladores))
    gravar(agrupar_por_prefixo(acumuladores), diretorio_saida)
    logger.info("gravados centros de %d CEPs em %s", len(acumuladores), diretorio_saida)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dir-cnefe", type=Path, required=True)
    argumentos = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    gerar_centros_cep(argumentos.dir_cnefe)


if __name__ == "__main__":
    main()


class CentrosCep:
    """Consulta os centros já gerados, lendo cada arquivo de prefixo uma vez."""

    def __init__(self, diretorio: Path = DIRETORIO_SAIDA) -> None:
        self.diretorio = diretorio
        self.cache: dict[str, dict[str, list]] = {}

    def centro(self, cep: str | None) -> tuple[float, float] | None:
        if not cep or len(cep) != 8:
            return None
        prefixo = cep[:3]
        if prefixo not in self.cache:
            arquivo = self.diretorio / f"{prefixo}.json"
            self.cache[prefixo] = json.loads(arquivo.read_text(encoding="utf-8")) if arquivo.exists() else {}
        encontrado = self.cache[prefixo].get(cep)
        return (encontrado[0], encontrado[1]) if encontrado else None
