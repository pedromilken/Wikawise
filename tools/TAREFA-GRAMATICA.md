# Tarefa: gramática dos níveis 3 a 6 do Wikawise

Feita **dentro do Qwen Code**, parte por parte, de forma interativa (é o uso que o Token Plan permite). Não transforme isto num script que chama a API.

## Para o agente

Para a parte `tools/gramatica/gram-N-PP.txt` indicada pelo usuário:

1. Leia o trecho do programa oficial de gramática (语法大纲) do HSK N. Cada linha tem colunas separadas por ` | `; a extração do PDF às vezes quebra um ponto em duas linhas. Junte o que for do mesmo ponto.
2. Para **cada ponto gramatical** do trecho, crie:
   - um **ponto** explicado em português do Brasil: `t` (nome curto, pode incluir a estrutura em chinês, ex.: "把 + objeto + verbo + complemento"), `e` (explicação em até 2 frases, com uma analogia prática quando ajudar), `zh` (uma frase-exemplo natural, só com vocabulário do HSK até o nível N), `pt` (tradução da frase);
   - **2 itens de lacuna**: `s` (frase em chinês com `___` no lugar da resposta; pode terminar com uma dica curta em português entre parênteses), `o` (exatamente 4 opções diferentes, distratores plausíveis do mesmo tipo), `a` (a resposta, igual a uma das opções), `ex` (explicação curta em português de por que é essa).
3. Crie também **1 frase para montar** por ponto, quando fizer sentido: `zh` (até 25 caracteres) e `pt` (tradução).
4. Ignore linhas que sejam só categorias sem conteúdo (ex.: "句子成分") e pontos que já apareceram numa parte anterior do mesmo nível.
5. Grave `tools/gramatica/gram-N-PP.json` com **um único objeto**:

```json
{
  "pontos": [{"t": "…", "e": "…", "zh": "…", "pt": "…"}],
  "itens":  [{"s": "…___…", "o": ["…", "…", "…", "…"], "a": "…", "ex": "…"}],
  "frases": [{"zh": "…", "pt": "…"}]
}
```

6. Rode `node tools/juntar-gramatica.js` e corrija o que ele recusar.

## Regras de qualidade

- Português natural do Brasil; nada de tradução literal.
- Frases em chinês naturais e corretas; nada de frases inventadas que um nativo não diria.
- Um item testa **um** ponto; a resposta não pode ser deduzida só pela forma das opções.
- Não repita a mesma frase-exemplo em pontos diferentes.
