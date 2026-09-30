#!/usr/bin/env node
/* Lista as palavras acima do nivel nas frases da gramatica gerada (tools/gramatica/gram-N-PP.json).
   Segmentacao por programacao dinamica: entre todas as divisoes possiveis da frase em palavras do vocabulario
   oficial, escolhe a que tem menos palavras acima do nivel (evita falsos positivos como yi+ge+ren lido como geren).
   Uso: node tools/checar-nivel-gramatica.js [--nivel 3] */
const fs = require("fs"), path = require("path");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const SO = arg("--nivel", null);
const src = fs.readFileSync(path.join(__dirname, "..", "src", "data.js"), "utf8"), DATA = JSON.parse(src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1));
const LV = {}; DATA.words.forEach(w => { if (!LV[w.z] || w.lv < LV[w.z]) LV[w.z] = w.lv; });
const MAX = Math.max(...Object.keys(LV).map(z => z.length));
function acima(frase, nivel) {
  const out = [];
  for (const trecho of frase.split(/[^\u4e00-\u9fff]+/).filter(Boolean)) {
    const n = trecho.length, best = Array(n + 1).fill(null); best[0] = { cost: 0, toks: 0, prev: -1, w: null };
    for (let i = 0; i < n; i++) {
      if (!best[i]) continue;
      for (let L = 1; L <= Math.min(MAX, n - i); L++) {
        const p = trecho.slice(i, i + L), lv = LV[p];
        if (!lv && L > 1) continue;
        const c = best[i].cost + (!lv ? 1.01 : lv > nivel ? 1 : 0), t = best[i].toks + 1, j = i + L;
        if (!best[j] || c < best[j].cost || (c === best[j].cost && t < best[j].toks)) best[j] = { cost: c, toks: t, prev: i, w: p };
      }
    }
    for (let j = n; j > 0; j = best[j].prev) { const p = best[j].w; if (LV[p] && LV[p] > nivel) out.unshift(`${p}(${LV[p]})`); }
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
console.log(`${total} entradas com vocabulario acima do nivel. Numero entre parenteses = nivel da palavra no HSK 3.0.`);