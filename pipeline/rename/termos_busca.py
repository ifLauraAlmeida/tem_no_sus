"""Deriva termos de busca a partir da Denominação Comum Brasileira (DCB).

O usuário costuma digitar só o princípio ativo ("losartana", "metformina"),
sem o sal. Os termos removem o sal apenas quando o restante continua sendo
um princípio ativo; "cloreto de sódio" não vira "sódio".
"""

import re
import unicodedata

PREFIXOS_SAL = (
    "acetato", "besilato", "bromidrato", "cloridrato", "dicloridrato", "fosfato", "fumarato",
    "maleato", "mesilato", "succinato", "sulfato", "tartarato", "valerato", "hemitartarato",
    "dipropionato", "propionato", "furoato", "brometo", "citrato", "nitrato", "palmitato",
)
SUFIXOS_SAL = (
    "potassica", "sodica", "calcica", "magnesica", "monoidratada", "di-hidratada", "hidratada",
    "de sodio", "de potassio", "de calcio", "de magnesio",
)
# Restos que são íons, elementos ou ânions de sais inorgânicos, e não o
# princípio ativo da DCB ("cloreto de sódio" não pode virar "cloreto").
RESTOS_INVALIDOS = frozenset(
    {
        "sodio", "potassio", "calcio", "magnesio", "zinco", "ferro", "litio", "prata",
        "cloreto", "bicarbonato", "carbonato", "gluconato", "lactato", "fosfato", "sulfato",
        "citrato", "acetato", "iodeto", "fluoreto", "hidroxido", "oxido",
    }
)
TAMANHO_MINIMO_TERMO = 4


def normalizar(texto: str) -> str:
    sem_acentos = unicodedata.normalize("NFD", texto.lower())
    sem_acentos = "".join(caractere for caractere in sem_acentos if unicodedata.category(caractere) != "Mn")
    return re.sub(r"\s+", " ", sem_acentos).strip()


def remover_anotacoes(denominacao: str) -> str:
    # "(FN)" indica Formulário Nacional; nomes científicos de plantas ficam entre parênteses.
    return re.sub(r"\([^)]*\)", " ", denominacao)


def remover_sal(componente: str) -> str:
    termo = componente
    for prefixo in PREFIXOS_SAL:
        termo = re.sub(rf"^{prefixo} de ", "", termo)
    for sufixo in SUFIXOS_SAL:
        termo = re.sub(rf" {sufixo}$", "", termo)
    return termo.strip()


def derivar_termos_busca(denominacao: str) -> list[str]:
    componentes = [normalizar(parte) for parte in remover_anotacoes(denominacao).split("+")]
    termos: list[str] = []
    for componente in componentes:
        sem_sal = remover_sal(componente)
        candidato = sem_sal if sem_sal not in RESTOS_INVALIDOS else componente
        for termo in (componente, candidato):
            if len(termo) >= TAMANHO_MINIMO_TERMO and termo not in termos:
                termos.append(termo)
    return termos
