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
- Vocabulário até o nível N, conferido com `tools/checar-nivel-gramatica.js` antes de gravar; exceção só para a palavra-alvo do ponto.

## Regras de resposta única (obrigatórias)

Toda lacuna deve ter **exatamente uma** opção que produza frase gramatical **e** coerente com o sentido/hint da frase. Antes de gravar, teste cada uma das 3 opções erradas: se ela também formar frase correta e com sentido, o item está quebrado — refaça.

- **Quase-sinônimos (modais, medidores, advérbios de grau/escopo/tempo/frequência):** não basta trocar o distrator por outro da mesma família. Use um **ponto de apoio sintático** que só a resposta aceita (ex.: `需要` antes de substantivo; `得/应该/愿意` exigem verbo; `遍` = leitura completa e não combina com 声/口/顿) ou uma **moldura de negação** que só a resposta preenche (ex.: `一点儿也不愿意`; `一点也不`+modal de obrigação é agramatical).
- **Medidores (量词):** garanta que a incompatibilidade seja **de classe da palavra**, não só de tradução — o certo (遍) e os errados (声/口/顿) devem ser todos medidores, e só o certo combina com o verbo/objeto dados.
- **Verbos em `一边…一边…` / serial verb:** escolha o objeto que force **colocação única** (ex.: `睡觉` com 一边, e `做/买/吃觉` são agramaticais). Não deixe dois verbos plausíveis (看书/听书/写书) na mesma lacuna.
- **Pronomes:** se `大家`, `别人`, `自己` etc. competirem, fixe a oposição no contexto ("nós dois" exclui `大家`; "outras pessoas fora do casal" pede `别人`), ou troque o distrator que colide.
- **Não repita a frase-exemplo de um ponto dentro de um item.** Se o item espelhar o exemplo, mude um dos dois.
- **Autocheck final:** leia o item com cada uma das 4 opções em voz alta (mentalmente); a resposta certa é a única frase que um nativo aprovaria **sem** o hint. Se precisar do hint para decidir, o distrator ainda é forte demais.

Essas regras valem para as próximas partes (gram-3-02 a gram-6-02).
