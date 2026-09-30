#!/usr/bin/env node
/* Confere as respostas tools/gramatica/gram-N-PP.json e junta em tools/fontes/gramatica_pt.json.
   Uso: node tools/juntar-gramatica.js */
const fs = require("fs"), path = require("path");
const DIR = path.join(__dirname, "gramatica"), OUT = path.join(__dirname, "fontes", "gramatica_pt.json");
const han = s => /[\u4e00-\u9fff]/.test(s || ""), str = s => typeof s === "string" && s.trim().length > 0;
const res = {}; let ok = 0, ruins = 0, falta = 0;
for (const f of fs.readdirSync(DIR).filter(f => /^gram-\d-\d+\.txt$/.test(f)).sort()) {
  const lv = f.split("-")[1], jf = path.join(DIR, f.replace(".txt", ".json"));
  if (!fs.existsSync(jf)) { console.log(`${f}: sem resposta ainda`); falta++; continue; }
  let o; try { o = JSON.parse(fs.readFileSync(jf, "utf8")); } catch (e) { console.log(`${f}: JSON inválido (${e.message})`); falta++; continue; }
  const R = res[lv] = res[lv] || { pontos: [], itens: [], frases: [] }, erros = [];
  (o.pontos || []).forEach((p, i) => { if (str(p.t) && str(p.e) && han(p.zh) && str(p.pt)) R.pontos.push({ t: p.t.trim(), e: p.e.trim(), zh: p.zh.trim(), pt: p.pt.trim() }); else erros.push("ponto " + (i + 1)); });
  (o.itens || []).forEach((g, i) => {
    const bom = str(g.s) && g.s.split("___").length === 2 && Array.isArray(g.o) && g.o.length === 4 && new Set(g.o).size === 4 && g.o.includes(g.a) && str(g.ex);
    if (bom) R.itens.push({ s: g.s.trim(), o: g.o.map(x => String(x).trim()), a: String(g.a).trim(), ex: g.ex.trim() }); else erros.push("item " + (i + 1));
  });
  (o.frases || []).forEach((x, i) => { if (han(x.zh) && str(x.pt) && x.zh.length <= 25) R.frases.push({ zh: x.zh.trim(), pt: x.pt.trim() }); else erros.push("frase " + (i + 1)); });
  ok++; ruins += erros.length;
  console.log(`${f}: ${(o.pontos || []).length} pontos, ${(o.itens || []).length} itens, ${(o.frases || []).length} frases` + (erros.length ? ` · recusados: ${erros.join(", ")}` : ""));
}
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
const tot = Object.values(res).reduce((a, r) => [a[0] + r.pontos.length, a[1] + r.itens.length, a[2] + r.frases.length], [0, 0, 0]);
console.log(`${ok} partes prontas, ${falta} pendentes, ${ruins} entradas recusadas. Total: ${tot[0]} pontos, ${tot[1]} itens, ${tot[2]} frases. Depois: python tools/build_data.py && python build.py && node tests.js`);
