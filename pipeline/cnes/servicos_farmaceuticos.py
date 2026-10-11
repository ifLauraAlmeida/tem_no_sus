"""Classificação do serviço especializado 125 (serviço de farmácia) do CNES."""

from collections.abc import Iterable
from dataclasses import dataclass
from enum import StrEnum

CODIGO_SERVICO_FARMACIA = "125"
COLUNAS_SR = ("CNES", "CODUFMUN", "SERV_ESP", "CLASS_SR", "AMB_SUS", "COMPETEN")


class FrenteDisponibilizacao(StrEnum):
    CEAF = "CEAF"
    FARMACIA_POPULAR_CNES = "FARMACIA_POPULAR_CNES"
    MANIPULACAO_HOMEOPATICA = "MANIPULACAO_HOMEOPATICA"
    CESAF = "CESAF"
    CBAF = "CBAF"
    FARMACIA_HOSPITALAR = "FARMACIA_HOSPITALAR"
    FARMACIA_VIVA = "FARMACIA_VIVA"


FRENTE_POR_CLASSIFICACAO = {
    "001": FrenteDisponibilizacao.CEAF,
    "002": FrenteDisponibilizacao.FARMACIA_POPULAR_CNES,
    "003": FrenteDisponibilizacao.MANIPULACAO_HOMEOPATICA,
    "004": FrenteDisponibilizacao.CESAF,
    "005": FrenteDisponibilizacao.CBAF,
    "006": FrenteDisponibilizacao.FARMACIA_HOSPITALAR,
    "007": FrenteDisponibilizacao.FARMACIA_VIVA,
}

# Componentes da assistência farmacêutica só contam como local de retirada
# quando o atendimento ambulatorial SUS está declarado.
FRENTES_COMPONENTES_SUS = frozenset(
    {FrenteDisponibilizacao.CBAF, FrenteDisponibilizacao.CEAF, FrenteDisponibilizacao.CESAF}
)


@dataclass(frozen=True)
class ServicoFarmaceutico:
    cnes: str
    codigo_municipio: str
    frente: FrenteDisponibilizacao
    atendimento_ambulatorial_sus: bool
    competencia: str


def classificar_frente(classificacao_sr: str) -> FrenteDisponibilizacao:
    frente = FRENTE_POR_CLASSIFICACAO.get(classificacao_sr)
    if frente is None:
        raise ValueError(
            f"classificação do serviço 125 desconhecida: {classificacao_sr!r}; "
            f"esperado uma de {sorted(FRENTE_POR_CLASSIFICACAO)}"
        )
    return frente


def converter_indicador(valor: str, coluna: str) -> bool:
    if valor not in {"0", "1"}:
        raise ValueError(f"indicador {coluna} inválido: {valor!r}; esperado '0' ou '1'")
    return valor == "1"


def extrair_servicos_farmaceuticos(registros_sr: Iterable[dict[str, str]]) -> list[ServicoFarmaceutico]:
    return [
        ServicoFarmaceutico(
            cnes=registro["CNES"],
            codigo_municipio=registro["CODUFMUN"],
            frente=classificar_frente(registro["CLASS_SR"]),
            atendimento_ambulatorial_sus=converter_indicador(registro["AMB_SUS"], "AMB_SUS"),
            competencia=registro["COMPETEN"],
        )
        for registro in registros_sr
        if registro["SERV_ESP"] == CODIGO_SERVICO_FARMACIA
    ]


def indica_local_de_retirada(servico: ServicoFarmaceutico) -> bool:
    if servico.frente == FrenteDisponibilizacao.FARMACIA_POPULAR_CNES:
        return True
    return servico.frente in FRENTES_COMPONENTES_SUS and servico.atendimento_ambulatorial_sus
