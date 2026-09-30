#!/usr/bin/env node
/* Prepara lotes de palavras sem glosa em português para traduzir DENTRO de uma ferramenta de programação
   (Qwen Code, Claude Code, Cline…), de forma interativa, como os termos do Coding Plan/Token Plan permitem.
   Não chama nenhuma API. Uso: node tools/preparar-lotes.js [--niveis 3,4,5,6] [--lote 150] */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), DIR = path.join(__dirname, "lotes"), FEITO = path.join(__dirname, "fontes", "pt_glosas.json");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const LEVELS = arg("--niveis", "3,4,5,6").split(",").map(Number), N = +arg("--lote", 150);
const src = fs.readFileSync(path.join(ROOT, "src", "data.js"), "utf8"), DATA = JSON.parse(src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1));
const feito = fs.existsSync(FEITO) ? JSON.parse(fs.readFileSync(FEITO, "utf8")) : {};
const todo = [], vistos = new Set();
for (const w of DATA.words) if (LEVELS.includes(w.lv) && !w.pt && !feito[w.z] && !vistos.has(w.z)) { vistos.add(w.z); todo.push(w); }
fs.mkdirSync(DIR, { recursive: true });
for (const f of fs.readdirSync(DIR)) if (/^lote-\d+\.tsv$/.test(f)) fs.unlinkSync(path.join(DIR, f));
let k = 0;
for (let i = 0; i < todo.length; i += N) {
  k++; const nome = `lote-${String(k).padStart(2, "0")}`;
  const linhas = ["palavra\tpinyin\tclasse\tingles"].concat(todo.slice(i, i + N).map(w => [w.z, w.p, (w.c || []).join(","), (w.en || "").replace(/\t/g, " ")].join("\t")));
  fs.writeFileSync(path.join(DIR, nome + ".tsv"), linhas.join("\n") + "\n");
}
console.log(`${todo.length} palavras em ${k} lotes de até ${N}, em tools/lotes/. Siga tools/TAREFA-GLOSAS.md dentro do Qwen Code.`);
