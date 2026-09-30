#!/usr/bin/env node
/* Fatia o programa oficial de gramática (语法大纲) dos níveis 3 a 6 em partes, para gerar explicações e exercícios
   DENTRO do Qwen Code (uso interativo, como o Token Plan permite). Não chama API.
   Uso: node tools/preparar-gramatica.js [--niveis 3,4,5,6] [--linhas 30] */
const fs = require("fs"), path = require("path");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const LEVELS = arg("--niveis", "3,4,5,6").split(",").map(Number), N = +arg("--linhas", 30);
const OF = JSON.parse(fs.readFileSync(path.join(__dirname, "fontes", "gramatica_oficial.json"), "utf8"));
const DIR = path.join(__dirname, "gramatica"); fs.mkdirSync(DIR, { recursive: true });
let total = 0;
for (const lv of LEVELS) {
  const linhas = OF[lv] || []; let k = 0;
  for (let i = 0; i < linhas.length; i += N) {
    k++; total++;
    const nome = `gram-${lv}-${String(k).padStart(2, "0")}.txt`;
    const cab = `# HSK ${lv} · parte ${k} · linhas ${i + 1}–${Math.min(i + N, linhas.length)} de ${linhas.length} do 语法大纲\n# colunas separadas por " | " (类别 | 类别名称 | 细目 | 语法内容); a extração do PDF quebra algumas linhas\n\n`;
    fs.writeFileSync(path.join(DIR, nome), cab + linhas.slice(i, i + N).join("\n") + "\n");
  }
}
console.log(`${total} partes em tools/gramatica/. Siga tools/TAREFA-GRAMATICA.md dentro do Qwen Code.`);
