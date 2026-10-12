# Tem No SUS?

O **Tem No SUS?** é uma aplicação web criada para ajudar cidadãos a descobrir se os medicamentos presentes em uma receita médica podem ser obtidos gratuitamente por meio do SUS, do Programa Farmácia Popular ou de estabelecimentos públicos de saúde.

A aplicação terá uma interface simples em formato de chatbot. O usuário informa os medicamentos prescritos e o sistema consulta uma base estruturada a partir de fontes oficiais para identificar onde cada medicamento pode ser retirado.

Quando houver disponibilidade, o sistema também poderá indicar os estabelecimentos mais próximos do endereço informado pelo usuário e gerar um PDF para impressão contendo os medicamentos encontrados, os tipos de estabelecimento onde podem ser obtidos e as respectivas referências oficiais.

---

## Objetivo

Facilitar o acesso da população às informações públicas sobre medicamentos disponibilizados gratuitamente no Brasil.

O sistema deverá responder perguntas como:

- Este medicamento está disponível gratuitamente?
- Ele pode ser retirado na Farmácia Popular?
- Existe disponibilidade em UBS ou Clínica da Família?
- Ele pertence a algum componente da assistência farmacêutica do SUS?
- Existe algum estabelecimento estadual ou federal responsável pela dispensação?
- Quais são os locais mais próximos onde posso tentar retirar esse medicamento?
- Qual documento oficial informa que esse medicamento faz parte do programa?

---

## Funcionalidades principais

### 1. Consulta de medicamentos

O usuário poderá informar um ou vários medicamentos presentes em sua receita.

Exemplo:

```text
Losartana 50 mg
Metformina 850 mg
Sinvastatina 20 mg
```

O sistema deverá normalizar os nomes informados e identificar possíveis correspondências com os medicamentos cadastrados.

A busca deverá considerar:

- princípio ativo;
- nome genérico;
- concentração;
- forma farmacêutica;
- apresentação;
- possíveis sinônimos;
- nomes comerciais, quando houver mapeamento seguro para o princípio ativo.

O sistema não deverá sugerir substituição de medicamentos nem realizar orientação clínica.

---

### 2. Classificação da disponibilidade

Para cada medicamento encontrado, o sistema deverá informar em quais modalidades ele está disponível.

Possíveis classificações:

- Farmácia Popular;
- UBS / Clínica da Família;
- farmácia municipal;
- unidade estadual de dispensação;
- unidade federal;
- Componente Básico da Assistência Farmacêutica;
- Componente Estratégico da Assistência Farmacêutica;
- Componente Especializado da Assistência Farmacêutica;
- outro programa público aplicável.

Exemplo de resposta:

```text
Losartana 50 mg

Disponível gratuitamente pelo Programa Farmácia Popular.

Também pode estar disponível na rede municipal de atenção básica,
dependendo da programação e do estoque local.
```

A aplicação deverá diferenciar:

1. medicamento previsto oficialmente em um programa;
2. medicamento potencialmente distribuído por determinado componente;
3. confirmação de estoque local.

A presença do medicamento em uma lista oficial **não significa que a unidade possui estoque naquele momento**.

---

## 3. Localização dos estabelecimentos

Depois de identificar medicamentos disponíveis gratuitamente, o chatbot solicitará a localização do usuário.

Campos mínimos:

- estado;
- município;
- bairro;
- rua.

Opcionalmente poderão ser utilizados:

- número;
- CEP;
- geolocalização do navegador, mediante autorização explícita.

O endereço será convertido em coordenadas geográficas para calcular a distância até os estabelecimentos.

---

## 4. Indicação dos estabelecimentos mais próximos

O sistema deverá apresentar até **4 estabelecimentos** próximos ao usuário.

Quando houver mais de um tipo de serviço disponível, a distribuição deverá buscar diversidade.

Exemplo:

```text
2 UBS / Clínicas da Família
2 unidades participantes do Farmácia Popular
```

Caso apenas um tipo de estabelecimento esteja disponível, poderão ser exibidos quatro estabelecimentos do mesmo tipo.

Cada resultado deverá apresentar:

- nome;
- tipo de estabelecimento;
- endereço;
- distância aproximada;
- medicamentos relacionados;
- indicação clara quando for Farmácia Popular;
- fonte do cadastro;
- data da última atualização conhecida.

---

## 5. PDF para impressão

O usuário poderá gerar um relatório em PDF contendo:

- medicamentos consultados;
- medicamentos identificados como disponíveis;
- modalidade de acesso;
- nome do programa;
- estabelecimento(s) sugerido(s);
- endereço;
- documento oficial relacionado;
- número e/ou nome da portaria, resolução, nota técnica ou lista oficial;
- data de consulta;
- aviso sobre possível indisponibilidade de estoque.

O PDF deverá servir como material informativo.

Ele **não substitui receita médica, laudo, prescrição, autorização ou qualquer documento exigido para dispensação**.

---

## Fontes de dados previstas

A aplicação deverá priorizar exclusivamente dados públicos e documentos oficiais.

Fontes possíveis:

- Ministério da Saúde;
- Programa Farmácia Popular;
- Relação Nacional de Medicamentos Essenciais — RENAME;
- Base Nacional de Estabelecimentos de Saúde — CNES;
- dados abertos do SUS;
- secretarias estaduais de saúde;
- secretarias municipais de saúde;
- listas oficiais de medicamentos;
- portarias;
- resoluções;
- notas técnicas;
- documentos de assistência farmacêutica;
- dados públicos de estabelecimentos credenciados.

Cada informação relacionada à disponibilidade de medicamentos deverá armazenar a respectiva fonte.

---

## Arquitetura inicial

```text
tem-no-sus/
│
├── app/
│   ├── api/
│   ├── chatbot/
│   ├── medicamentos/
│   ├── estabelecimentos/
│   ├── geolocalizacao/
│   ├── documentos/
│   └── pdf/
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── reference/
│
├── scripts/
│   ├── ingestao/
│   ├── tratamento/
│   └── atualizacao/
│
├── templates/
│
├── static/
│   ├── css/
│   ├── js/
│   └── img/
│
├── tests/
│
├── docs/
│
├── README.md
├── backlog.md
├── escopo_do_projeto.md
├── requirements.txt
├── .env.example
└── .gitignore
```

A estrutura poderá ser alterada conforme o projeto evoluir.

---

## Stack inicial

### Backend

- Python;
- Flask ou FastAPI;
- SQLAlchemy;
- Pydantic, caso FastAPI seja adotado.

### Frontend

- HTML;
- CSS;
- JavaScript.

A primeira versão poderá utilizar HTML renderizado pelo próprio backend.

### Banco de dados

Sugestão inicial:

- PostgreSQL.

Durante desenvolvimento local, SQLite poderá ser utilizado para protótipos.

### Geolocalização

O projeto deverá utilizar algum mecanismo de:

- geocodificação de endereço;
- cálculo de latitude/longitude;
- cálculo de distância entre usuário e estabelecimento.

Evitar dependência obrigatória de serviços pagos no MVP.

### PDF

Possíveis bibliotecas:

- WeasyPrint;
- ReportLab.

---

## Modelo inicial de dados

### Medicamento

```text
id
principio_ativo
nome_normalizado
concentracao
forma_farmaceutica
apresentacao
codigo_catmat
codigo_atc
ativo
```

### Programa

```text
id
nome
esfera
descricao
```

### Disponibilidade

```text
id
medicamento_id
programa_id
tipo_disponibilidade
fonte_documento_id
data_inicio
data_fim
situacao
ultima_verificacao
```

### Documento oficial

```text
id
titulo
tipo
numero
ano
orgao
url
data_publicacao
data_verificacao
```

### Estabelecimento

```text
id
cnes
cnpj
nome
tipo
subtipo
logradouro
numero
bairro
municipio
uf
cep
latitude
longitude
farmacia_popular
ativo
data_atualizacao
```

---

## Fluxo esperado

```text
Usuário
   ↓
Chatbot
   ↓
Entrada dos medicamentos
   ↓
Normalização dos nomes
   ↓
Busca no banco de medicamentos
   ↓
Verificação das regras de disponibilização
   ↓
Medicamento disponível?
   ├── Não → informar que não foi identificado nas bases utilizadas
   │
   └── Sim
        ↓
   Solicitar localização
        ↓
   Geocodificar endereço
        ↓
   Buscar estabelecimentos compatíveis
        ↓
   Calcular distância
        ↓
   Exibir até 4 opções
        ↓
   Oferecer geração do PDF
```

---

## Regra de segurança da informação

O sistema deverá trabalhar com o mínimo possível de dados pessoais.

Evitar armazenar:

- nome completo;
- CPF;
- telefone;
- receita médica;
- diagnóstico;
- dados clínicos desnecessários.

O endereço digitado deverá ser utilizado prioritariamente apenas para cálculo de proximidade.

Se houver armazenamento, deverão existir justificativa, finalidade definida, política de retenção e mecanismos de exclusão.

---

## LGPD

Como o sistema poderá processar endereço e informações relacionadas a medicamentos, o desenvolvimento deverá observar princípios da Lei Geral de Proteção de Dados.

Princípios importantes:

- finalidade;
- adequação;
- necessidade;
- transparência;
- segurança;
- prevenção;
- não discriminação.

O MVP deverá preferir processamento temporário e evitar criação de perfil individual do usuário.

---

## Limitações importantes

O sistema não deverá afirmar:

```text
"este medicamento está disponível agora nesta unidade"
```

a menos que exista uma fonte oficial de estoque em tempo real.

Na ausência de estoque em tempo real, utilizar linguagem como:

```text
"Este estabelecimento integra a rede onde esse medicamento pode ser dispensado.
A disponibilidade de estoque deve ser confirmada diretamente com a unidade."
```

---

## Aviso de saúde

O **Tem No SUS?** é uma ferramenta de consulta informativa.

A aplicação:

- não realiza diagnóstico;
- não substitui médico ou farmacêutico;
- não recomenda medicamentos;
- não altera prescrições;
- não define dosagem;
- não recomenda substituição de princípio ativo;
- não garante estoque.

---

## MVP

A primeira versão deverá ser capaz de:

1. receber o nome de um medicamento;
2. normalizar a entrada;
3. consultar uma base de medicamentos;
4. informar se há previsão de disponibilização gratuita;
5. informar por qual programa;
6. solicitar localização;
7. buscar estabelecimentos próximos;
8. retornar até quatro estabelecimentos;
9. exibir a fonte oficial;
10. gerar um PDF simples.

---

## Possíveis evoluções

- leitura de receita por imagem;
- OCR;
- identificação automática de múltiplos medicamentos;
- integração com mapas;
- filtros de acessibilidade;
- consulta por CEP;
- consulta por princípio ativo;
- cache geográfico;
- atualização automatizada das bases;
- histórico de versões dos documentos oficiais;
- API pública;
- PWA;
- versão mobile;
- informações sobre documentação necessária para retirada;
- horários de funcionamento;
- telefones públicos das unidades;
- integração com dados públicos de estoque quando disponíveis.

---

## Como executar

A página usa módulos JavaScript e carrega o elenco via `fetch`, por isso precisa de um servidor HTTP local:

```bash
python3 -m http.server 8000
```

Acesse <http://localhost:8000>.

Testes (Node.js 22+, sem dependências externas):

```bash
npm test
```

### Pipeline de estabelecimentos (CNES)

Requer Python 3.12 (a dependência `pyreaddbc` ainda não tem suporte a 3.14):

```bash
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m pipeline.cnes.executar --uf TO --competencia 202608
.venv/bin/python -m pytest
```

Gera `data/processed/estabelecimentos/{UF}.json` e atualiza o `indice.json` lido pela página. Arquivos brutos ficam em `data/raw/` (fora do git).

### Extração da RENAME (Componente Básico)

```bash
curl -L -o rename2024.pdf https://bvsms.saude.gov.br/bvs/publicacoes/relacao_nacional_medicamentos_2024_2ed.pdf
.venv/bin/python -m pipeline.rename.componente_basico --pdf rename2024.pdf
```

Gera `data/reference/rename_2024_componente_basico.json`.

As fontes oficiais e a frequência de atualização de cada uma estão em [`docs/fontes_oficiais.md`](docs/fontes_oficiais.md). As regras de uso do CNES estão em [`docs/cnes_servico_farmacia.md`](docs/cnes_servico_farmacia.md).

---

## Status

```text
Em desenvolvimento.
Consulta implementada no elenco do Farmácia Popular (31/08/2026) e no Componente Básico da RENAME 2024.
Nomes não encontrados recebem aviso de possível falta de cobertura ou erro de digitação, com sugestão de grafia.
Após a consulta, o chat pede o endereço, converte em coordenadas (ViaCEP + Nominatim) e indica até 4 locais do CNES.
Pendentes: componentes estratégico e especializado, listas municipais (REMUME) e PDF.
```

---

## Licença

A licença do projeto será definida posteriormente.

Dados públicos utilizados deverão manter referência à fonte original e obedecer aos respectivos termos de uso.
