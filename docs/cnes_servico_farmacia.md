# CNES — serviço de farmácia (125) e frentes de disponibilização

O CNES responde **onde existe estabelecimento com serviço de farmácia cadastrado**. Ele não informa quais medicamentos o local tem nem o estoque atual.

```text
1. o SUS prevê o medicamento?      → elenco PFPB, RENAME, REMUME/RESME, PCDT
2. onde há local habilitado?       → CNES (este documento) + lista oficial do PFPB
3. tem estoque agora?              → sem fonte pública integrada; o usuário confirma com a unidade
```

---

## Fontes

| Dado | Origem | Atualização |
|---|---|---|
| Serviços especializados (`SR`) | `ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/SR/SR{UF}{AA}{MM}.dbc` | mensal, por competência |
| Estabelecimentos (`ST`) | `ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/ST{UF}{AA}{MM}.dbc` | mensal |
| Nome, endereço e coordenadas | `https://apidadosabertos.saude.gov.br/cnes/estabelecimentos/{cnes}` | contínua (cadastro atual) |
| Nomes dos municípios | `https://servicodados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios` | estável |

Na verificação de 11/10/2026, a competência mais recente no FTP era **2026-08** (publicada em 15/09/2026).

---

## Diferenças entre o layout publicado e os arquivos reais

O informe técnico de disseminação (IT_CNES_1706) é histórico. Diferenças encontradas na competência 202608:

- o `SR` **não tem** `AMB_HOSP`; no lugar, há quatro indicadores: `AMB_SUS`, `AMB_NSUS`, `HOSP_SUS`, `HOSP_NSUS` (valores `"0"`/`"1"`);
- o `ST` **não tem** nome fantasia nem logradouro; esses dados vêm da API de dados abertos;
- o `CODUFMUN` tem 6 dígitos (código IBGE sem o dígito verificador).

O pipeline valida as colunas esperadas e falha se alguma estiver ausente.

---

## Classificação do serviço 125

| `CLASS_SR` | Frente | Usado como local de retirada? |
|---|---|---|
| 001 | Componente Especializado (CEAF) | sim, se `AMB_SUS = 1` |
| 002 | Farmácia Popular segundo o CNES | sim, com aviso: credenciamento deve ser confirmado no painel oficial |
| 003 | Manipulação homeopática | não |
| 004 | Componente Estratégico (CESAF) | sim, se `AMB_SUS = 1` |
| 005 | Componente Básico (CBAF) | sim, se `AMB_SUS = 1` |
| 006 | Farmácia hospitalar | **não** — farmácia hospitalar não implica retirada pelo cidadão |
| 007 | Farmácia Viva | não |

Classificações fora dessa tabela fazem o pipeline falhar, para que um novo código do CNES não seja descartado silenciosamente.

---

## Relação com os medicamentos consultados

- Medicamento do elenco do Farmácia Popular: até 2 farmácias da **lista oficial de farmácias ativas** do programa (ver `docs/fontes_oficiais.md`) e até 2 estabelecimentos `125/005` (rede básica).
- Medicamento só do Componente Básico da RENAME: até 4 estabelecimentos `125/005`.

O `125/002` do CNES não é mais usado: a lista oficial do programa prevalece e cobre todas as farmácias ativas, enquanto o CNES registra só uma pequena parte delas.

---

## Limitações conhecidas

- **Público restrito**: unidades como as de atenção primária no sistema prisional aparecem com o mesmo tipo de unidade (`TP_UNID = 02`) e a mesma clientela das UBS comuns, sem campo que as diferencie no `SR`, no `ST` ou na API. Não filtramos por nome, para não criar regra frágil; o cartão da rede pública avisa que algumas unidades atendem só públicos específicos.
- **Territorialização**: na atenção primária, a retirada costuma depender da unidade de referência do endereço do usuário. O CNES não informa o território de cada unidade.
- **Localização das farmácias**: 8.196 (39%) têm coordenadas no CNES; 11.705 (56%) são estimadas pelo centro do CEP (CNEFE/IBGE) e o cartão avisa a estimativa; 881 (4%) têm CEP fora do CNEFE e entram na ordenação só quando ficam no bairro (distância presumida de 1,5 km) ou no município (6 km) do CEP do usuário.

---

## Saída do pipeline

`data/processed/estabelecimentos/{UF}.json`, um registro por estabelecimento, com as frentes declaradas, a competência do CNES e as datas de obtenção. Os arquivos originais ficam em `data/raw/` (fora do git), com hash SHA-256 registrado.
