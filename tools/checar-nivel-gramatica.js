#!/usr/bin/env node
/* Lista as palavras acima do nível nas frases da gramática gerada (tools/gramatica/gram-N-PP.json).
   Segmenta cada frase pela correspondência mais longa com o vocabulário oficial do HSK 1–6 e aponta as palavras
   de nível maior que N. Não altera nada. Uso: node tools/checar-nivel-gramatica.js [--nivel 3] */
const fs = require("fs"), path = require("path");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const SO = arg("--nivel", null);
const src = fs.readFileSync(path.join(__dirname, "..", "src", "data.js"), "utf8"), DATA = JSON.parse(src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1));
const LV = {}; DATA.words.forEach(w => { if (!LV[w.z] || w.lv < LV[w.z]) LV[w.z] = w.lv; });
const MAX = Math.max(...Object.keys(LV).map(z => z.length));
function acima(frase, nivel) {
  const out = []; let i = 0; const s = frase.replace(/[^\u4e00-\u9fff]/g, "|");
  while (i < s.length) {
    if (s[i] === "|") { i++; continue; }
    let achou = null;
    for (let n = Math.min(MAX, s.length - i); n >= 1; n--) { const p = s.slice(i, i + n); if (LV[p]) { achou = p; break; } }
    if (achou) { if (LV[achou] > nivel) out.push(`${achou}(${LV[achou]})`); i += achou.length; } else i++;
  }
  return out;
}
const DIR = path.join(__dirname, "gramatica"); let total = 0;
for (const f of fs.readdirSync(DIR).filter(f => /^gram-\d-\d+\.json$/.test(f)).sort()) {
  const nivel = +f.split("-")[1]; if (SO && nivel !== +SO) continue;
  const o = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")), achados = [];
  (o.pontos || []).forEach((p, i) => { const a = acima(p.zh, nivel); if (a.length) achados.push(`ponto ${i + 1}: ${a.join(" ")}`); });
  (o.itens || []).forEach((g, i) => { const a = acima(g.s.replace("___", g.a), nivel); if (a.length) achados.push(`item ${i + 1}: ${a.join(" ")}`); });
  (o.frases || []).forEach((x, i) => { const a = acima(x.zh, nivel); if (a.length) achados.push(`frase ${i + 1}: ${a.join(" ")}`); });
  total += achados.length;
  console.log(`${f}: ${achados.length ? achados.length + " com palavras acima do HSK " + nivel : "ok"}`); achados.forEach(a => console.log("   " + a));
}
console.log(`${total} entradas com vocabulário acima do nível. Número entre parênteses = nível da palavra no HSK 3.0.`);
