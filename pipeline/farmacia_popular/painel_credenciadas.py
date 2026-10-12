"""Extrai a lista oficial de farmácias ativas do Programa Farmácia Popular.

A fonte é o painel público do Ministério da Saúde ("Consulta de Endereço das
Farmácias"), atualizado diariamente. O painel só responde a navegadores, então
a extração abre a página num Chrome headless e consulta os dados pela mesma
API Qlik que a página usa para o botão "Baixar dados".
"""

import json
import logging
import shutil
import subprocess
import tempfile
import time
import urllib.request
from dataclasses import dataclass

import websocket

logger = logging.getLogger(__name__)

URL_PAINEL = "https://infoms.saude.gov.br/extensions/SEIDIGI_DEMAS_PFPB_ENDERECOS/index.html"
ID_APP_QLIK = "31d43831-6a9b-4f91-b435-218484ea186b"
CAMPOS_PAINEL = ("CNPJ", "Farmácia", "Endereço", "Bairro", "Cód. Município", "Município", "UF", "Data do Credenciamento")
PORTA_DEPURACAO = 9333
TEMPO_MAXIMO_CARREGAMENTO_SEGUNDOS = 90
LINHAS_POR_PAGINA = 1000
TEMPO_MAXIMO_LEITURA_SEGUNDOS = 300

# Monta um cubo com os campos da tabela e lê todas as páginas dentro da
# própria página do painel; devolve JSON com as linhas e a data de referência.
SCRIPT_EXTRACAO = """
new Promise(async (concluir) => {
  setTimeout(() => concluir(JSON.stringify({ erro: "tempo esgotado na leitura do painel" })), %(limite_ms)d);
  try {
    const app = window.qlik.openApp("%(app)s", { host: location.hostname, prefix: "/", isSecure: true });
    const campos = %(campos)s;
    const definicao = {
      qDimensions: campos.map((campo) => ({ qDef: { qFieldDefs: [campo] }, qNullSuppression: true })),
      qMeasures: [],
      qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: campos.length, qHeight: 1 }],
    };
    const referencia = await app.createGenericObject({
      data: { qStringExpression: "=Date(max(all [Data do Registro]), 'YYYY-MM-DD')" },
    });
    const layoutReferencia = await referencia.getLayout();
    const modelo = await app.createCube(definicao);
    const layout = await modelo.getLayout();
    const total = layout.qHyperCube.qSize.qcy;
    const linhas = [];
    for (let topo = 0; topo < total; topo += %(pagina)d) {
      const [pagina] = await modelo.getHyperCubeData("/qHyperCubeDef", [
        { qTop: topo, qLeft: 0, qWidth: campos.length, qHeight: %(pagina)d },
      ]);
      pagina.qMatrix.forEach((linha) => linhas.push(linha.map((celula) => celula.qText)));
    }
    concluir(JSON.stringify({ total, linhas, dataReferencia: layoutReferencia.data }));
  } catch (erro) {
    concluir(JSON.stringify({ erro: String(erro && (erro.message || JSON.stringify(erro))) }));
  }
})
"""


class PainelIndisponivelError(RuntimeError):
    """O painel oficial não carregou ou não respondeu (falha de infraestrutura)."""


@dataclass(frozen=True)
class FarmaciaCredenciada:
    cnpj: str
    nome: str
    logradouro: str
    bairro: str
    codigo_municipio: str
    municipio: str
    uf: str
    data_credenciamento: str


class SessaoDevTools:
    def __init__(self, url_websocket: str) -> None:
        self.conexao = websocket.create_connection(url_websocket, timeout=600, suppress_origin=True)
        self.proximo_id = 0

    def enviar(self, metodo: str, parametros: dict | None = None) -> dict:
        self.proximo_id += 1
        self.conexao.send(json.dumps({"id": self.proximo_id, "method": metodo, "params": parametros or {}}))
        while True:
            mensagem = json.loads(self.conexao.recv())
            if mensagem.get("id") == self.proximo_id:
                return mensagem

    def avaliar(self, expressao: str) -> object:
        resposta = self.enviar("Runtime.evaluate", {"expression": expressao, "awaitPromise": True, "returnByValue": True})
        return resposta.get("result", {}).get("result", {}).get("value")

    def fechar(self) -> None:
        self.conexao.close()


def iniciar_chrome(diretorio_perfil: str) -> subprocess.Popen:
    executavel = shutil.which("google-chrome") or shutil.which("chromium")
    if executavel is None:
        raise PainelIndisponivelError("chrome ou chromium não encontrado; necessário para abrir o painel oficial")
    argumentos = [executavel, "--headless=new", "--disable-gpu", f"--remote-debugging-port={PORTA_DEPURACAO}",
                  f"--user-data-dir={diretorio_perfil}", "about:blank"]
    return subprocess.Popen(argumentos, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def conectar_pagina() -> SessaoDevTools:
    for _ in range(30):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{PORTA_DEPURACAO}/json", timeout=5) as resposta:
                alvos = json.load(resposta)
            pagina = next(alvo for alvo in alvos if alvo["type"] == "page")
            return SessaoDevTools(pagina["webSocketDebuggerUrl"])
        except (OSError, StopIteration):
            time.sleep(1)
    raise PainelIndisponivelError("não foi possível conectar ao chrome headless")


def aguardar_qlik(sessao: SessaoDevTools) -> None:
    limite = time.monotonic() + TEMPO_MAXIMO_CARREGAMENTO_SEGUNDOS
    while time.monotonic() < limite:
        if sessao.avaliar("typeof window.qlik !== 'undefined'"):
            return
        time.sleep(2)
    raise PainelIndisponivelError(f"painel não carregou em {TEMPO_MAXIMO_CARREGAMENTO_SEGUNDOS}s: {URL_PAINEL}")


def ler_painel() -> dict:
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as diretorio_perfil:
        chrome = iniciar_chrome(diretorio_perfil)
        try:
            sessao = conectar_pagina()
            sessao.enviar("Page.navigate", {"url": URL_PAINEL})
            aguardar_qlik(sessao)
            script = SCRIPT_EXTRACAO % {"app": ID_APP_QLIK, "campos": json.dumps(CAMPOS_PAINEL), "pagina": LINHAS_POR_PAGINA,
                                        "limite_ms": TEMPO_MAXIMO_LEITURA_SEGUNDOS * 1000}
            resultado = json.loads(sessao.avaliar(script) or '{"erro": "sem resposta"}')
            sessao.fechar()
        finally:
            chrome.terminate()
            chrome.wait(timeout=30)
    if "erro" in resultado:
        raise PainelIndisponivelError(f"falha ao ler o painel: {resultado['erro']}")
    return resultado


def converter_linha(linha: list[str]) -> FarmaciaCredenciada:
    cnpj, nome, logradouro, bairro, codigo_municipio, municipio, uf, data_credenciamento = linha
    if not (cnpj.isdigit() and len(cnpj) == 14):
        raise ValueError(f"cnpj inválido no painel: {cnpj!r}; esperado 14 dígitos")
    return FarmaciaCredenciada(cnpj, nome.strip(), logradouro.strip(), bairro.strip(), codigo_municipio, municipio, uf, data_credenciamento)


def validar_total(resultado: dict) -> None:
    # Se o número de linhas lidas diverge do tamanho do cubo, a paginação
    # falhou e a base ficaria incompleta sem aviso.
    if len(resultado["linhas"]) != resultado["total"]:
        raise PainelIndisponivelError(f"leitura incompleta: {len(resultado['linhas'])} de {resultado['total']} linhas")
