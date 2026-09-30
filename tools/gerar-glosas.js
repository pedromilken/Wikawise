#!/usr/bin/env node
/* Gera glosas em português para as palavras dos níveis 3 a 6 que ainda não têm (as dos níveis 1 e 2 são autorais, em fontes/pt_l12.txt).
   Uso:  node tools/gerar-glosas.js [--niveis 3,4] [--lote 80]
   Chave: DEEPSEEK_API_KEY no ambiente, ou digitada na hora (não aparece na tela). Modelo: DEEPSEEK_MODEL (padrão deepseek-chat).
   Saída: tools/fontes/pt_glosas.json (acumulativa; pode interromper e rodar de novo). Depois: python tools/build_data.py && python build.py */
const fs = require("fs"), path = require("path"), readline = require("readline");
const ROOT = path.join(__dirname, ".."), OUT = path.join(__dirname, "fontes", "pt_glosas.json");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const LEVELS = arg("--niveis", "3,4,5,6").split(",").map(Number), BATCH = +arg("--lote", 80);
const DATA = (() => { const src = fs.readFileSync(path.join(ROOT, "src", "data.js"), "utf8"); return JSON.parse(src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1)); })();
const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const todo = DATA.words.filter(w => LEVELS.includes(w.lv) && !w.pt && !done[w.z]);
function askKey() { return new Promise(res => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true }); rl.stdoutMuted = true; rl._writeToOutput = s => { if (!rl.stdoutMuted) rl.output.write(s); }; process.stdout.write("Chave do DeepSeek (sk-...): "); rl.question("", k => { rl.close(); process.stdout.write("\n"); res(k.trim()); }); }); }
(async () => {
  if (!todo.length) { console.log("Nada a fazer: todas as palavras desses níveis já têm glosa."); return; }
  let key = process.env.DEEPSEEK_API_KEY || await askKey();
  if (!/^sk-/.test(key)) { console.error("Chave inválida (esperado sk-...)."); process.exit(1); }
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  console.log(todo.length, "palavras sem glosa em português nos níveis", LEVELS.join(", "));
  for (let i = 0; i < todo.length; i += BATCH) {
    const lote = todo.slice(i, i + BATCH);
    const lista = lote.map(w => `${w.z}\t${w.p}\t${(w.c || []).join(",")}\t${w.en}`).join("\n");
    const prompt = "Para cada palavra do HSK abaixo (caractere, pinyin, classe, glosa em inglês do CC-CEDICT), escreva uma glosa curta em português do Brasil (até 6 palavras), no sentido mais comum para quem estuda para o HSK, como um falante nativo escreveria. Ignore sentidos de sobrenome, variantes arcaicas e abreviações. Responda SOMENTE com um objeto JSON {\"palavra\":\"glosa\"}.\n\n" + lista;
    for (let tent = 0; tent < 3; tent++) {
      try {
        const r = await fetch("https://api.deepseek.com/chat/completions", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + key }, body: JSON.stringify({ model, temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }) });
        if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 200));
        const j = await r.json(), obj = JSON.parse(j.choices[0].message.content);
        let n = 0; for (const w of lote) if (typeof obj[w.z] === "string" && obj[w.z].trim()) { done[w.z] = obj[w.z].trim(); n++; }
        fs.writeFileSync(OUT, JSON.stringify(done, null, 1));
        console.log(`lote ${i / BATCH + 1}: ${n}/${lote.length} glosas`); break;
      } catch (e) { console.warn("tentativa", tent + 1, "falhou:", e.message); await new Promise(r => setTimeout(r, 3000)); }
    }
  }
  console.log("Pronto. Agora rode: python tools/build_data.py && python build.py");
})();
