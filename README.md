# Wikawise

Treino adaptativo de **mandarim para o HSK 3.0**, com *knowledge tracing*, cinco habilidades e tutor de IA. Da mesma família do [ENEMWise](https://github.com/pedromilken/enemwise), do [DevWise](https://github.com/pedromilken/DevWise) e do [IAWise](https://github.com/pedromilken/IAWise): mesmo motor de rastreamento, mesma economia de XP, mesmo tutor com chave própria.

**Usar:** https://pedromilken.github.io/Wikawise/ (depois de ativar o GitHub Pages na branch `main`, pasta raiz).

## O que tem dentro

| Conteúdo | Origem | Quantidade |
|---|---|---|
| Vocabulário dos níveis 1 a 6 | Programa do exame HSK (CLEC, nov. 2025), com pinyin e classe gramatical | 5.389 palavras em 109 unidades de 50 |
| Caracteres de leitura (认读字) | mesmo programa | por nível |
| Caracteres de escrita à mão (书写字) | mesmo programa | 100 no nível 2; 150 nos níveis 3 a 6; nenhum no nível 1 |
| Gramática oficial (语法大纲) | mesmo programa, texto original | níveis 1 a 6 |
| Pontos de gramática explicados | autoral, com exemplo, pinyin, tradução e aula do curso que cobre | 17 no nível 1, 17 no nível 2 |
| Exercícios de gramática | autorais + lacunas do curso | 94 lacunas (28 novas + 66 do curso) e 9 frases para montar |
| Curso M2 (Mandarim Básico, HSK 2) | resumo autoral das 12 aulas, desenvolvidas com base no material do HSK, das partes escritas, dos exercícios e revisões, das pautas de ideogramas e da aula de músicas e ditados (`tools/fontes/curso_m2.json` e `curso_m2_extras.json`) | 14 lições: teoria, 89 lacunas, 50 frases para montar, 7 diálogos com perguntas, 251 palavras, escrita à mão dos 199 caracteres das pautas; letras de músicas não são reproduzidas |
| Materiais de apoio | links por nível | programa oficial, Chinese Testing International, áudios, simulados e livros HSK |

As glosas em **português** cobrem todo o vocabulário dos níveis 1 e 2. Nos níveis 3 a 6 aparece a glosa em inglês do CC-CEDICT (marcada com **en**) até você gerar as traduções com `tools/gerar-glosas.js`.

## Princípios do HSK 3.0 aplicados

- **Três etapas, nove níveis (三等九级).** O mapa segue os níveis 1 a 6 (etapas elementar e intermediária) com o vocabulário *novo* de cada nível, conforme o programa de 2025 (300, 200, 500, 1.000, 1.600 e 1.800 palavras; 300, 500, 1.000, 2.000, 3.600 e 5.400 acumuladas). O nível 7–9 fica de fora nesta versão.
- **Quatro dimensões (四维基准).** Cada exercício treina uma: **sílabas** (pinyin com tons), **caracteres** (escrita à mão), **vocabulário** (significado e tradução) e **gramática** (lacunas e frases).
- **Cinco habilidades (听说读写译).** Tipos de exercício por habilidade:

| Habilidade | Exercício | Observação |
|---|---|---|
| Ouvir 听 | ouve a palavra e escolhe o caractere | usa a voz em chinês do navegador; sem voz, fica oculto |
| Falar 说 | fala a palavra; o reconhecimento de fala confere | Chrome e Edge; sem suporte, fica oculto |
| Ler 读 | caractere → significado; perguntas sobre os diálogos | |
| Escrever 写 | escreve o caractere traço a traço na grade (Hanzi Writer) | só a partir do nível 2 e só com os caracteres do programa de escrita, como exige o HSK 3.0; sem conexão, vira escolha do caractere |
| Traduzir 译 | significado → palavra; montar a frase a partir do português | |

- **Escrita à mão só onde o exame pede:** nível 1 sem escrita; níveis 2 a 6 com a lista oficial de 书写字 acumulada.

## Arsenal HSK (módulos 1 a 6)

A aba **Arsenal HSK** tem um módulo por nível do HSK 3.0, cada um com as abas Teoria, Praticar, Vocabulário, Caracteres (leitura e escrita à mão, com ordem dos traços), Programa oficial e Material de apoio; o módulo 2 inclui o Curso M2. A sequência segue o programa oficial do HSK 3.0, que é a base dos livros novos; o texto dos livros não é reproduzido.

A teoria reúne, nível a nível, os pontos explicados (com exemplo, pinyin e tradução), os exercícios (lacunas e frases para montar) e o texto do programa oficial (语法大纲). Os níveis 1 e 2 têm conteúdo autoral; os níveis 3 a 6 são gerados no Qwen Code, parte por parte, a partir do programa oficial:

```powershell
node tools/preparar-gramatica.js                 # fatia o 语法大纲 dos níveis 3 a 6 em tools/gramatica/ (não chama API)
qwen                                             # no Qwen Code: "siga tools/TAREFA-GRAMATICA.md para gram-3-01"
node tools/juntar-gramatica.js                   # confere e junta em tools/fontes/gramatica_pt.json
python tools/build_data.py; python build.py; node tests.js
```

O conferidor recusa itens sem `___`, sem 4 opções distintas ou com a resposta fora das opções.

## Rastreamento e jogo (herdados do DevWise/IAWise)

- **Elo/Rasch pilota**: domínio por unidade, 60% libera a próxima, 85% domina. O nível seguinte abre quando 60% das unidades do nível atual chegam a 60%. **TRI 3PL, BKT, PFA e AFM** rodam como sombras e registram no log a previsão feita antes de cada resposta; o relatório compara Brier, AUC e acurácia.
- **Prior hierárquico**: a primeira unidade começa em 15%; cada unidade seguinte começa em 0,5·15% + 0,5·(domínio da anterior); a primeira unidade de um nível usa a média do nível anterior.
- **Duas camadas de domínio**: por unidade (o que libera o mapa) e por habilidade/dimensão em cada nível (o que o relatório mostra em 听说读写译 + sílabas + gramática).
- **Seleção adaptativa**: primeiro o tipo de exercício (alternando habilidades e aproximando a dificuldade do domínio atual), depois a palavra (evita as recentes, prefere as ainda não acertadas).
- **Lente** (loja) remove duas opções erradas: o acerto vale meia evidência (`w: 0.5` no log).
- XP por dificuldade (10/20/35 × modo), penalidade por erro, sequência, bônus de recuperação, quatro modos, loja com escudo, XP em dobro, lente, chave e títulos.
- **Modo livre** (Ajustes) abre todos os níveis; as respostas vão ao log com `free: 1`.
- **Relatório** imprimível (PDF) e exportável em JSON no formato longo de datasets de KT (uma linha por resposta, com `preds` de todos os modelos, `dim`, `type`, `prior`, `hint`, `keyed`, `free`).

## Tutor de IA (traga sua própria chave)

Em **Ajustes**: Anthropic, OpenAI, Google Gemini, DeepSeek, Groq/Llama, Mistral, OpenRouter ou endpoint OpenAI-compatível. A chave fica só no `localStorage` do navegador e as chamadas vão direto ao provedor. O tutor recebe o nível, as palavras da unidade e o exercício atual; antes da resposta dá pistas sem revelar, depois explica o porquê com analogias.

## Dados e privacidade

Não há servidor. Progresso e log ficam no `localStorage` (`wikawise-v1`). Para pesquisa, o estudante exporta o JSON e envia; coleta automática exigiria destino configurado, aprovação ética (CEP) e consentimento livre e esclarecido.

## Estrutura

```
index.html            arquivo único gerado (é o que o GitHub Pages serve)
build.py              junta src/ em index.html
tests.js              testes sem navegador (node tests.js)
src/data.js           gerado por tools/build_data.py
src/i18n.js           textos da interface (português e inglês)
src/models.js         Elo, TRI 3PL, BKT, PFA, AFM (do DevWise/IAWise)
src/game.js           XP, modos, loja, patentes
src/engine.js         itens, seleção adaptativa, desbloqueio, priors (sem DOM)
src/llm.js            tutor com chave própria (do IAWise)
src/app.js            interface
src/style.css
tools/build_data.py   gera src/data.js a partir de tools/fontes/
tools/gerar-glosas.js glosas em português dos níveis 3 a 6 (DeepSeek ou Qwen)
tools/fontes/         listas oficiais, glosas, gramática, curso
```

### Atualizar

```powershell
python tools/build_data.py      # precisa de: pip install pypinyin jieba
python build.py
node tests.js
```

### Gerar as glosas em português dos níveis 3 a 6

```powershell
$env:DEEPSEEK_API_KEY = "sk-..."   # ou deixe em branco e digite quando pedir
node tools/gerar-glosas.js --niveis 3,4,5,6
python tools/build_data.py; python build.py
```

Com Qwen (chave **pay-as-you-go** do Model Studio; chaves do Token Plan e do Coding Plan não podem ser usadas em scripts em lote):

```powershell
node tools/gerar-glosas.js --provedor qwen --niveis 3,4,5,6            # região Singapura (dashscope-intl)
node tools/gerar-glosas.js --provedor qwen-cn --modelo qwen-max        # região Pequim, outro modelo
```

**Com o Coding Plan ou o Token Plan** da Alibaba: esses planos só podem ser usados de forma interativa dentro de ferramentas de programação, então o `gerar-glosas.js` recusa chaves `sk-sp-`. Faça pelo Qwen Code, lote a lote:

```powershell
node tools/preparar-lotes.js --niveis 3,4,5,6    # cria tools/lotes/lote-NN.tsv (não chama API)
qwen                                             # no Qwen Code: "siga tools/TAREFA-GLOSAS.md para o lote-01"
node tools/juntar-lotes.js                       # confere e junta em tools/fontes/pt_glosas.json
```

O script grava em `tools/fontes/pt_glosas.json` a cada lote; pode interromper e rodar de novo, inclusive trocando de provedor.

## Fontes e direitos

- Programa do exame HSK (新版HSK考试大纲, Center for Language Education and Cooperation, nov. 2025): vocabulário, caracteres e gramática, via [leonsilicon/hsk3.1](https://github.com/leonsilicon/hsk3.1).
- Glosas em inglês: CC-CEDICT, via [drkameleon/complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT).
- Ordem dos traços: [Hanzi Writer](https://hanziwriter.org) (MIT), carregado do jsDelivr.
- Curso M2 (Mandarim Básico, HSK 2): resumo autoral das aulas, desenvolvidas com base no material do HSK. Os PDFs das aulas não estão no repositório.
- Os livros da série HSK Standard Course têm direitos da Beijing Language and Culture University Press; a aba de materiais só aponta para páginas externas. Esses livros e simulados seguem o HSK 2.0.
