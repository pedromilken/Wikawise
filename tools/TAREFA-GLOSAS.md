# Tarefa: glosas em português para o Wikawise

Esta tarefa é feita **dentro de uma ferramenta de programação** (Qwen Code, Claude Code, Cline…), de forma interativa, lote por lote.
É o uso que os termos do Coding Plan e do Token Plan da Alibaba permitem. Não transforme isto num script que chama a API.

## Para o agente

Para o arquivo `tools/lotes/lote-NN.tsv` indicado pelo usuário:

1. Leia o TSV (colunas: `palavra`, `pinyin`, `classe`, `ingles`). A coluna `ingles` vem do CC-CEDICT e às vezes traz o sentido errado (sobrenome, variante antiga, abreviação); ignore esses sentidos.
2. Para cada palavra, escreva uma glosa curta em **português do Brasil** (até 6 palavras), no sentido mais comum para quem estuda para o HSK, como um falante nativo escreveria. Verbos no infinitivo; sem artigos desnecessários; separe sentidos diferentes com ponto e vírgula.
3. Grave `tools/lotes/lote-NN.json` com um único objeto `{"palavra": "glosa", ...}`, **com todas as palavras do lote**, sem comentários.
4. Rode `node tools/juntar-lotes.js` e corrija o lote se ele indicar palavras faltando.

Exemplos: `安静 → silencioso; tranquilo` · `把握 → segurar; ter certeza` · `报名 → inscrever-se` · `毕业 → formar-se (na escola)`.

## Regras complementares

- **Classificadores** (量词): comece com "classificador de …" (ex.: `封 → classificador de cartas; lacrar`).
- **Frequência**: não use "sempre" para `常`/`常常`/`经常`; use "frequentemente; muitas vezes". Reserve "sempre" para `总是`/`一直`.
- **Modais** (`必须`, `应该`, `需要`, `该`): use locuções no infinitivo ("ter que", "dever"), não "must"/"precisa" solto.
- **Partículas e conectivos**: descreva a função gramatical, não traduza por palavras soltas (ex.: `的话 → se (no fim da condição)`).
- **Sentido HSK**: prefira sempre o sentido mais frequente para quem estuda o HSK; descarte sentidos raros, obsoletos, de sobrenome ou variante antiga do CC-CEDICT.
