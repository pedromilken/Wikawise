/* Adaptador do laboratório de agentes: WIKAWISE (mandarim, HSK 3.0).
   O núcleo (laboratorio.js) é o mesmo nas cinco ferramentas; este arquivo só diz ao núcleo o que é um item, o que o
   agente "estudou" (notas) e como corrigir. Tudo vem do motor sem DOM do próprio Wikawise (src/engine.js).

   Itens: os do jogo, com as mesmas opções (E.options) e o mesmo gabarito (E.answerKey). Ficam de fora os que exigem
   áudio ou microfone (ouvir, falar). A escrita à mão entra na forma de múltipla escolha que o jogo usa sem caneta.
   Apresentação: como na tela do jogo, com o pinyin onde o jogo o mostra por padrão.
   Notas = a matéria da habilidade no próprio jogo:
     unidade de vocabulário (hNuNN)  a lista de palavras da unidade com pinyin e glosa (o que o aluno estuda)
     gramática (gN)                  os pontos de gramática do nível (Arsenal) + até 4 exemplos resolvidos de OUTROS itens
     aula do curso (cNN)             as estruturas, a nota da aula e o vocabulário da aula
   Escolha adaptativa: o pick() do próprio Wikawise, com o domínio do Elo canônico. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
module.exports = {
  id: "wikawise", nome: "Wikawise",
  carregar({ ROOT, LAB }) {
    const ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
    for (const f of ["data.js", "models.js", "game.js", "engine.js", "i18n.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, "src", f), "utf8").replace(/^const (\w+) =/gm, "var $1 ="), ctx);
    const { DATA, ENGINE: E, LANG } = ctx, caps = { voice: false, mic: false, writer: false };
    const skillsAll = [...DATA.levels.flatMap(L => L.units.map(u => u.id)), ...DATA.levels.map(L => "g" + L.lv).filter(g => E.itemsFor(g, caps).length), ...Array.from({ length: 14 }, (_, i) => "c" + String(i + 1).padStart(2, "0"))];
    const items = []; const byId = {};
    for (const s of skillsAll) for (const it of E.itemsFor(s, caps)) { if (["listen", "speak"].includes(it.type)) continue; if (it.type === "write") it.c = .25; items.push(it); byId[it.id] = it; }
    const t = (lang, k) => (LANG[lang] || LANG.pt)[k] || LANG.pt[k] || k;
    const area = s => s[0] === "h" ? "vocabulario" : s[0] === "g" ? "gramatica" : "curso";
    const skillName = s => s[0] === "h" ? "HSK " + E.UNITS[s].lv + " · unidade " + E.UNITS[s].n : s[0] === "g" ? "Gramática HSK " + s.slice(1) : "Curso M2 · aula " + +s.slice(1);
    const W = it => E.wordOf(it), gl = (w, l) => E.gloss(w, l);
    function notes(lang, skill, exclude) {
      if (skill[0] === "h") { const u = E.UNITS[skill]; return "## " + skillName(skill) + " — vocabulary list\n" + u.w.map(z => { const w = E.WORD[z]; return "- " + z + " (" + w.p + "): " + gl(w, lang); }).join("\n"); }
      if (skill[0] === "g") { const lv = +skill.slice(1), pts = DATA.grammarPT[lv] || [];
        const ex = items.filter(i => i.skill === skill && i.id !== exclude && i.type === "gap").slice(0, 4);
        return "## " + skillName(skill) + "\n" + pts.map(g => "- " + g.t + ": " + g.e + " Ex.: " + g.zh + " (" + g.py + ") = " + g.pt).join("\n") +
          "\nWORKED EXAMPLES:\n" + ex.map(i => "* " + i.g.full + " (" + i.g.py + "): " + i.g.ex).join("\n"); }
      const n = +skill.slice(1), C = DATA.course;
      return "## " + skillName(skill) + "\n" + (C.theory[n] || []).map(r => "- " + r.s + " (" + r.u + "): " + r.zh + " (" + r.py + ") = " + r.pt).join("\n") + (C.notes[n] ? "\nNOTE: " + C.notes[n] : "") +
        "\nVOCABULARY:\n" + C.vocab.filter(v => v.a === n).map(v => "- " + v.zh + " (" + v.py + "): " + v.pt).join("\n");
    }
    /* o item como o jogo mostra; devolve enunciado e opções com a correta primeiro (o núcleo embaralha) */
    function render(lang, it, r) {
      const seed = Math.floor(r() * 1e9), opts = E.options(it, lang, seed), key = E.answerKey(it), w = W(it);
      const lab = o => o.py && it.type !== "translate" ? o.label + " (" + o.py + ")" : o.label;
      const correct = opts.find(o => o.key === key), others = opts.filter(o => o.key !== key);
      const mc = (prompt, extra) => ({ kind: "mc", prompt, options: [lab(correct), ...others.map(lab)], extra, correct: lab(correct) });
      const k = t(lang, "kind_" + it.type);
      if (it.type === "read") return mc(k + "\nWORD: " + w.z + " (" + w.p + ")");
      if (it.type === "pinyin") return mc(k + "\nWORD: " + w.z + "\nMEANING: " + gl(w, lang));
      if (it.type === "translate") return { ...mc(k + "\nMEANING: " + gl(w, lang)), options: [correct.label, ...others.map(o => o.label)], correct: correct.label };
      if (it.type === "write") return mc(k + " (" + t(lang, "writeFallback") + ")\nPINYIN: " + w.p + "\nMEANING: " + gl(w, lang) + "\nWORD WITH A GAP: " + w.z.replace(it.ch, "＿"));
      if (it.type === "gap") return mc(k + "\nSENTENCE: " + it.g.s);
      if (it.type === "rq") { const d = DATA.course.read[it.r]; return mc(k + "\nDIALOGUE (" + d.t + "):\n" + d.lines.map(l => l.sp + ": " + l.zh + " (" + l.py + ")").join("\n") + "\nQUESTION: " + it.q.q); }
      if (it.type === "order") { const s = it.s; return { kind: "order", prompt: k + "\nMEANING: " + (s.pt || ""), pieces: s.t || s.zh.split(""), alt: s.alt, correct: s.zh }; }
      return null;
    }
    function build(lang, it, r) {
      const v = render(lang, it, r); if (!v) return null;
      /* ordens alternativas aceitas pelo jogo também valem */
      if (v.kind === "order") return LAB.orderItem("", v.prompt, v.pieces, r, [].concat(v.alt || []).map(a => Array.isArray(a) ? a.join("") : String(a).replace(/[，。！？、\s]/g, "")).concat([String(v.correct).replace(/[，。！？、\s]/g, "")]));
      return LAB.mcItem("", v.prompt, v.options, r, v.extra);
    }
    const SYS = l => `You are role-playing an adult BEGINNER learning Mandarin Chinese for the HSK exam in a game. The game interface is in ${l}. You only know what is written in your NOTES below; if the NOTES do not cover the question, answer the way a beginner would guess, without using knowledge you are not supposed to have. Follow the reply format exactly and write nothing else.`;
    const langName = l => ({ pt: "Portuguese", en: "English" })[l] || l;
    return {
      dominioPt: "mandarim (HSK 3.0)", dominioEn: "Mandarin Chinese (HSK)", idiomas: ["pt", "en"],
      padrao: { habilidades: ["h1u01", "h1u02", "h2u01", "h3u01", "h4u01", "h5u01", "h6u01", "g1", "g2", "g3", "c03", "c06"], itensPorHabilidade: 10 },
      skills: skillsAll.map(id => ({ id, area: area(id) })), items, byId,
      area, skillName, langName, notes,
      attempt: (brain, lang, it, notesText, r) => { const q = build(lang, it, r); return LAB.singleTurn(brain, SYS(langName(lang)), q, notesText, r); },
      pick: (pool, m, recent, solved, r) => E.pick(pool, m, recent, solved, r),
      tutorTask: (lang, it, r) => { const v = render(lang, it, r); if (!v || v.kind !== "mc" || v.options.length < 2) return null;
        return { task: "ITEM:\n" + v.prompt + "\nOPTIONS:\n" + v.options.map(o => "- " + o).join("\n") + "\nTHE STUDENT CHOSE: " + v.options[1], correct: v.correct, reference: it.g && it.g.ex || "" }; },
      preview: (lang, it, notesText, r) => "NOTES:\n" + notesText + "\n\n" + build(lang, it, r).body,
      limites: ["Mandarim é muito presente no treino dos LLMs: espere vazamento alto (C0) no HSK 1–3 e mais degrau nos níveis 4–6.",
        "Itens de ouvir e falar ficam de fora (sem áudio); a escrita à mão entra como a múltipla escolha que o jogo usa sem caneta.",
        "As glosas em inglês dos níveis 3–6 vêm do CC-CEDICT e as em português foram geradas por LLM: num cérebro, glosas mais 'familiares' podem facilitar."]
    };
  }
};
