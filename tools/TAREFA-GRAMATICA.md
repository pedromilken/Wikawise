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

## Armadilhas de auditoria (erros recorrentes — evitar ao escrever e ao revisar)

Lista consolidada da revisão "professor nativo" de gram-3-01…05 e gram-4-01…05. Ao escrever ou revisar um item, cheque cada uma:

1. **Distrator de sequência/causa/conclusão que fecha a frase:** `于是`, `就`, `才`, `因为/由于`, `所以`, `而且`, `一定`, `多/几`, `让`. Ex.: "他很想买,___钱不够" aceita `却` mas também leria bem com conectivos; "会议___在下午三点开" aceita `一定`. Cura: contexto que bloqueie a leitura (hipótese irreal para `要是/就是…也`; futuro não realizado para `虽然/尽管`; item livre obrigatório para `不管/无论`; quantidade fixa antes/depois para `大约/左右/来/多`; `还好赶上了` para forçar `差一点` = não aconteceu).
2. **Quase-sinônimos na mesma lacuna (ambos naturais):** `让/被/叫/给` (passiva), `使/让` (causativo), `当/做` (选…当/做), `尽管/虽然`, `要是/如果`, `就是/即使`, `不管/无论`, `大约/左右/前后`, `连/甚至`, `既…又/也`, `不是…而是/就是/只是`, `怎么/谁` em retórica, `死了/极了/坏了/得很` (grau), `得了/得住/得完` (possibilidade). Cura: nunca oferecer os dois lados do par; se o par for inevitável, mude o frame para um apoio sintático que só um aceita (`谁+都/也`, `V+得+厉害` vs `adj+极了`, `被选为`, `把+O+V+在`).
3. **Resposta que gera frase agramatical (frame montado errado):** o clássico `看了___` + `了又` → `看了了又`. O frame certo é `看___看` / `想___想` (V+了+又+V). Sempre preencher a lacuna com a resposta e ler em voz alta antes de gravar.
4. **Partícula obrigatória do frame ausente, deixando distrator caber:** `难道…吗?` escrito sem `吗` deixa `怎么/什么` caberem; pares correlativos (`一边…一边`, `一…就`, `X也得X,不X也得X`) com uma peça só. Cura: incluir a partícula que ancora o frame (`吗`, a segunda peça do par) e tirar da lista de opções qualquer palavra que case com a frase sem ela (ex.: `到底` aceita `吗`, então não serve de distrator quando há `吗`).
5. **Lacuna léxica disfarçada de gramática:** completar um caractere de palavra fixa (`图书___`=馆, `三___二`=点) testa vocabulário, não estrutura. Cura: reposicionar a lacuna para a estrutura (ordem de leitura `三___五公里`, posição do medidor, `把+O+V+在/给`, frame `谁+都/也`).
6. **Item que espelha ou copia a frase-exemplo do ponto:** o aluno reconhece pelo exemplo, não pela gramática. Cura: trocar o contexto/verbo mantendo o frame.
7. **`ex` desalinhado das opções:** citar um distrator que não está na lista, ou afirmar regra falsa ("`甚至` não combina com `都`"). O `ex` deve justificar exatamente as 4 opções presentes.
8. **Gabarito invertido:** a resposta gera frase ruim e um distrator gera a boa. Sempre testar a resposta E cada distrator preenchidos.
9. **Ordem/colocação antinatural com a resposta:** `他都每天运动` (→ `每天都`), `好不迟到`, `就是太晚` (concessivo pede hipótese, não fato), `尽管+NP nu`. Ler a frase pronta como nativo.
10. **Cobertura por ponto:** ao revisar, confira que cada ponto tem ≥2 itens; pontos de frame comprimido (`不…也…`, `动词+一X是一X`) tendem a ficar com 1 só.

