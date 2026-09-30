#!/usr/bin/env node
/* Junta as respostas tools/lotes/lote-NN.json em tools/fontes/pt_glosas.json, conferindo cada lote.
   Uso: node tools/juntar-lotes.js */
const fs = require("fs"), path = require("path");
const DIR = path.join(__dirname, "lotes"), FEITO = path.join(__dirname, "fontes", "pt_glosas.json");
const feito = fs.existsSync(FEITO) ? JSON.parse(fs.readFileSync(FEITO, "utf8")) : {};
let novos = 0, faltando = 0;
for (const f of fs.readdirSync(DIR).filter(f => /^lote-\d+\.tsv$/.test(f)).sort()) {
  const esperadas = fs.readFileSync(path.join(DIR, f), "utf8").trim().split("\n").slice(1).map(l => l.split("\t")[0]);
  const jf = path.join(DIR, f.replace(".tsv", ".json"));
  if (!fs.existsSync(jf)) { console.log(`${f}: sem resposta ainda`); faltando += esperadas.length; continue; }
  let obj; try { obj = JSON.parse(fs.readFileSync(jf, "utf8")); } catch (e) { console.log(`${f}: JSON inválido (${e.message})`); faltando += esperadas.length; continue; }
  let ok = 0; const sem = [];
  for (const z of esperadas) { const g = obj[z]; if (typeof g === "string" && g.trim() && g.length <= 60) { if (!feito[z]) novos++; feito[z] = g.trim(); ok++; } else sem.push(z); }
  faltando += sem.length;
  console.log(`${f}: ${ok}/${esperadas.length}` + (sem.length ? ` · faltam: ${sem.slice(0, 8).join(" ")}${sem.length > 8 ? " …" : ""}` : ""));
}
fs.writeFileSync(FEITO, JSON.stringify(feito, null, 1));
console.log(`${novos} glosas novas; ${Object.keys(feito).length} no total; ${faltando} pendentes. Depois: python tools/build_data.py && python build.py && node tests.js`);
