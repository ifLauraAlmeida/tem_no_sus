"""Cadastro (nome, endereço, coordenadas) pela API de dados abertos do Ministério da Saúde.

Os arquivos ST de disseminação não trazem nome nem logradouro, por isso a API
complementa o cadastro. As respostas ficam em cache para tornar a execução
reproduzível e evitar requisições repetidas.
"""

import json
import logging
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

URL_API_CNES = "https://apidadosabertos.saude.gov.br/cnes/estabelecimentos"
TEMPO_LIMITE_SEGUNDOS = 30
TENTATIVAS = 3
PAUSA_ENTRE_REQUISICOES_SEGUNDOS = 0.2


class FonteIndisponivelError(RuntimeError):
    """Falha de infraestrutura ao consultar uma fonte externa."""


@dataclass(frozen=True)
class CadastroEstabelecimento:
    cnes: str
    nome: str
    logradouro: str | None
    numero: str | None
    bairro: str | None
    cep: str | None
    latitude: float | None
    longitude: float | None
    data_atualizacao: str | None


def converter_cadastro(resposta: dict) -> CadastroEstabelecimento:
    nome = resposta.get("nome_fantasia") or resposta.get("nome_razao_social")
    if not nome:
        raise ValueError(f"cadastro do cnes {resposta.get('codigo_cnes')!r} sem nome fantasia nem razão social")
    return CadastroEstabelecimento(
        cnes=str(resposta["codigo_cnes"]).zfill(7),
        nome=nome.strip(),
        logradouro=resposta.get("endereco_estabelecimento"),
        numero=resposta.get("numero_estabelecimento"),
        bairro=resposta.get("bairro_estabelecimento"),
        cep=resposta.get("codigo_cep_estabelecimento"),
        latitude=resposta.get("latitude_estabelecimento_decimo_grau"),
        longitude=resposta.get("longitude_estabelecimento_decimo_grau"),
        data_atualizacao=resposta.get("data_atualizacao"),
    )


def requisitar_cadastro(cnes: str) -> dict | None:
    url = f"{URL_API_CNES}/{cnes}"
    for tentativa in range(1, TENTATIVAS + 1):
        try:
            with urllib.request.urlopen(url, timeout=TEMPO_LIMITE_SEGUNDOS) as resposta:
                return json.load(resposta)
        except urllib.error.HTTPError as erro:
            if erro.code == 404:
                return None
            logger.warning("api cnes respondeu %s para %s (tentativa %d)", erro.code, cnes, tentativa)
        except (urllib.error.URLError, TimeoutError) as erro:
            logger.warning("falha de rede ao consultar %s: %s (tentativa %d)", cnes, erro, tentativa)
        time.sleep(2**tentativa)
    raise FonteIndisponivelError(f"api cnes indisponível para o cnes {cnes!r} após {TENTATIVAS} tentativas")


def consultar_cadastro(cnes: str, diretorio_cache: Path) -> CadastroEstabelecimento | None:
    arquivo_cache = diretorio_cache / f"{cnes}.json"
    if arquivo_cache.exists():
        resposta = json.loads(arquivo_cache.read_text(encoding="utf-8"))
    else:
        resposta = requisitar_cadastro(cnes)
        time.sleep(PAUSA_ENTRE_REQUISICOES_SEGUNDOS)
        diretorio_cache.mkdir(parents=True, exist_ok=True)
        arquivo_cache.write_text(json.dumps(resposta, ensure_ascii=False), encoding="utf-8")
    return converter_cadastro(resposta) if resposta else None
