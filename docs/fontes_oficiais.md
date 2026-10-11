# Fontes oficiais e onde ocorrem as atualizações

Levantamento feito em 11/10/2026. Cada fonte abaixo deve ser reverificada antes de qualquer carga nova de dados.

Regra geral: a presença de um medicamento em uma lista oficial indica **cobertura** (previsão de dispensação), nunca **estoque** em uma unidade específica.

---

## 1. Programa Farmácia Popular do Brasil (PFPB)

Fonte usada no MVP.

| Item | Onde | Frequência observada |
|---|---|---|
| Elenco de medicamentos e insumos | <https://www.gov.br/saude/pt-br/composicao/sectics/farmacia-popular/arquivos/elenco-de-medicamentos-e-insumos-pfpb.pdf> | sem periodicidade fixa; versão atual "atualizada em 31/08/2026" |
| Legislação (portarias) | <https://www.gov.br/saude/pt-br/composicao/sectics/farmacia-popular/legislacao> | a cada nova portaria |
| Lista de medicamentos com código de barras (EAN) | <https://www.gov.br/saude/pt-br/composicao/sectics/farmacia-popular/codigos-de-barras> | aproximadamente mensal (ex.: "EAN março/2026") |
| Endereço das farmácias credenciadas | painel "Endereço das Farmácias", linkado em <https://www.gov.br/saude/pt-br/composicao/sectics/farmacia-popular> | contínua |

Portarias relevantes identificadas:

- Portaria GM/MS nº 6.613, de 13/02/2025 — gratuidade para incontinência urinária (fralda geriátrica) e diabetes mellitus associada a doença cardiovascular (dapagliflozina);
- Portaria GM/MS nº 9.210, de 09/12/2025 — valores de referência;
- Portaria GM/MS nº 12.091, de 11/08/2026 — altera normas do programa;
- Portaria GM/MS nº 675, de 07/06/2023 — amplia gratuidade (contraceptivos, osteoporose, beneficiários do Bolsa Família).

O elenco é publicado apenas em PDF. A transcrição para `data/reference/farmacia_popular_elenco.json` preserva o texto original de cada linha em `descricao_original`.

---

## 2. RENAME — Relação Nacional de Medicamentos Essenciais

| Item | Onde |
|---|---|
| Página da RENAME | <https://www.gov.br/saude/pt-br/composicao/sectics/rename> |
| RENAME 2024 (vigente) | <https://www.gov.br/saude/pt-br/composicao/sectics/rename/publicacoes/relacao-nacional-de-medicamentos-essenciais-2024> |
| Publicações | <https://www.gov.br/saude/pt-br/composicao/sectics/rename/publicacoes> |

- Atualização bienal; a RENAME 2024 foi instituída pela Portaria GM/MS nº 6.324 e substituiu a RENAME 2022.
- Separa os medicamentos por componente da assistência farmacêutica (Básico, Estratégico, Especializado).
- Existe consulta "RENAME em tempo real" no painel BNAFAR do Ministério da Saúde.

Ainda não incorporada ao MVP.

---

## 3. SIGTAP — Tabela de Procedimentos, Medicamentos e OPM do SUS

É a chamada "tabela SUS".

| Item | Onde |
|---|---|
| Consulta e download | <http://sigtap.datasus.gov.br/tabela-unificada/app/download.jsp> |
| Documentação dos arquivos | <https://wiki.datasus.gov.br/sigtap/index.php/Download> |

- Atualizada **mensalmente pelo DATASUS**, a cada nova competência (aaaamm).
- Arquivos em ZIP com TXT de layout fixo, um conjunto por competência.
- Contém os medicamentos do Componente Especializado (grupo 06), com regras de faturamento (APAC). Serve para rastrear códigos e compatibilidades, não lista de dispensação para o cidadão.

Ainda não incorporada ao MVP.

---

## 4. Listas estaduais e municipais

- REMUME (municipal) e REMEME/listas estaduais são publicadas por cada secretaria, em geral em PDF e com periodicidade própria.
- Exemplos encontrados: REMUME 2026 de Goiânia e de Santa Maria (RS); REMEME 17.0 (jan/2026) do Espírito Santo.

Ainda não incorporadas ao MVP. A ausência de um medicamento nas bases usadas **não** significa que ele não seja ofertado pelo SUS no município.

---

## 5. CNES — Cadastro Nacional de Estabelecimentos de Saúde

Usado para localizar estabelecimentos com serviço de farmácia (serviço 125). Atualização mensal no DATASUS, por competência; complementado pela API de dados abertos (`apidadosabertos.saude.gov.br/cnes/estabelecimentos`) para nome, endereço e coordenadas. Detalhes em [`cnes_servico_farmacia.md`](cnes_servico_farmacia.md).

Painel oficial de farmácias credenciadas ao Farmácia Popular: <https://infoms.saude.gov.br/extensions/SEIDIGI_DEMAS_PFPB_ENDERECOS/index.html> (sem download estruturado; o conjunto "Estabelecimentos do Aqui tem Farmácia Popular" em dados.gov.br retornou acesso negado em 11/10/2026).
