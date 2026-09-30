/* Wikawise - interface. Derivado do DevWise/IAWise: mesmo motor de rastreamento (models.js), mesma economia (game.js), mesmo tutor (llm.js). */
const KEY = "wikawise-v1", PILOT = "elo";
const E = ENGINE;

/* ---------- estado ---------- */
function guessLang() { return /^pt/i.test(navigator.language || "pt") ? "pt" : "en"; }
function fresh() { return { v: 1, lang: guessLang(), skills: {}, dims: {}, solved: {}, log: [], xp: 0, xpTotal: 0, mode: "normal", inv: { shield: 0, boost: 0, lens: 0, key: 0 }, boost: 0, keyed: {}, titles: [], title: null, streak: 0, best: 0, lastWrong: false, free: false, py: true, theme: "auto", name: "", started: false }; }
function load() { try { const d = JSON.parse(localStorage.getItem(KEY) || "null"); if (d && d.v === 1) { const f = fresh(); for (const k in f) if (d[k] === undefined) d[k] = f[k]; if (!MODES[d.mode]) d.mode = "normal"; if (!LANG[d.lang]) d.lang = "pt"; return d; } } catch (e) { } return fresh(); }
let S = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }

/* ---------- utilidades ---------- */
const t = (k, p) => { let s = (LANG[S.lang] || LANG.pt)[k]; if (s == null) s = LANG.pt[k] != null ? LANG.pt[k] : k; if (p) for (const x in p) s = String(s).split("{" + x + "}").join(p[x]); return s; };
function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const k in (attrs || {})) { const v = attrs[k]; if (v == null || v === false) continue; if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else if (k === "html") n.innerHTML = v; else n.setAttribute(k, v === true ? "" : v); }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
}
const pct = p => Math.round(p * 100) + "%";
const $app = () => document.getElementById("app");
const pad = n => String(n).padStart(2, "0");
const skillName = s => s[0] === "h" ? `HSK ${s[1]} · ${t("unit")} ${+s.slice(3)}` : s[0] === "g" ? `HSK ${s.slice(1)} · ${t("grammar")}` : `${t("course")} · ${+s.slice(1) >= 13 ? DATA.course.lessons.find(l => l.n === +s.slice(1)).t : t("lessonOf", { n: +s.slice(1) })}`;

/* ---------- rastreamento ---------- */
const M = skill => { const tr = S.skills[skill]; return tr ? KT.mastery(tr, PILOT) : E.prior(skill, x => S.skills[x] ? KT.mastery(S.skills[x], PILOT) : 0); };
function track(skill) {
  if (!S.skills[skill]) { const p = E.prior(skill, M); S.skills[skill] = { L: p, n: 0, c: 0, prior: +p.toFixed(3) }; }
  return KT.ensure(S.skills[skill]);
}
function dimTrack(lv, dim) { const k = lv + ":" + dim; if (!S.dims[k]) S.dims[k] = { L: E.L0, n: 0, c: 0 }; return KT.ensure(S.dims[k]); }
function blendUpdate(tr, it, c, y, w) {
  const before = JSON.parse(JSON.stringify(tr.m)); KT.updateAll(tr, it, c, y);
  if (w < 1) for (const k in tr.m) for (const f in tr.m[k]) if (typeof tr.m[k][f] === "number" && typeof before[k][f] === "number") tr.m[k][f] = before[k][f] + (tr.m[k][f] - before[k][f]) * w;
}
function record(it, ok, opts = {}) {
  const tr = track(it.skill), c = opts.c != null ? opts.c : it.c, w = opts.hint ? .5 : 1, was = tr.L;
  const preds = KT.predictAll(tr, it, c);
  blendUpdate(tr, it, c, ok ? 1 : 0, w); tr.L = KT.mastery(tr, PILOT); tr.n++; if (ok) tr.c++;
  const dt = dimTrack(it.lv, it.dim); blendUpdate(dt, it, c, ok ? 1 : 0, w); dt.L = KT.mastery(dt, PILOT); dt.n++; if (ok) dt.c++;
  if (ok) S.solved[it.id] = 1;
  const x = GAME.gain(S, it.d, ok); S.xp = Math.max(0, S.xp + x); if (x > 0) S.xpTotal += x;
  S.streak = ok ? S.streak + 1 : 0; S.best = Math.max(S.best, S.streak); S.lastWrong = !ok;
  S.log.push({ ts: Date.now(), item: it.id, skill: it.skill, lv: it.lv, dim: it.dim, type: it.type, ok: ok ? 1 : 0, counted: 1, w, c: +c.toFixed(3), d: it.d, hint: opts.hint ? 1 : 0, keyed: S.keyed[it.skill] ? 1 : 0, free: S.free ? 1 : 0, prior: tr.prior, lang: S.lang, mode: S.mode, before: +was.toFixed(3), after: +tr.L.toFixed(3), preds, extra: opts.extra || undefined });
  save(); return x;
}
function status(skill) {
  if (!E.skillOpen(S, skill, M)) return "locked";
  const tr = S.skills[skill]; if (!tr || !tr.n) return "open";
  const m = M(skill); return m >= KT.master(PILOT) ? "master" : m >= E.UNLOCK ? "ok" : "learning";
}

/* ---------- recursos do navegador ---------- */
const CAPS = { voice: false, mic: !!(window.SpeechRecognition || window.webkitSpeechRecognition), writer: true };
let ZH_VOICE = null;
function loadVoices() { try { const v = speechSynthesis.getVoices(); ZH_VOICE = v.find(x => /^zh(-|_)?CN/i.test(x.lang)) || v.find(x => /^(zh|cmn)/i.test(x.lang)) || null; CAPS.voice = !!ZH_VOICE; } catch (e) { } }
if ("speechSynthesis" in window) { loadVoices(); speechSynthesis.onvoiceschanged = () => { const had = CAPS.voice; loadVoices(); if (had !== CAPS.voice) render(); }; }
function say(text, onend) { if (!ZH_VOICE) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.voice = ZH_VOICE; u.lang = ZH_VOICE.lang; u.rate = .8; if (onend) u.onend = onend; speechSynthesis.speak(u); } catch (e) { } }
const ICON_SAY = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>';
const sayBtn = text => el("button", { class: "say", type: "button", title: CAPS.voice ? "▶" : t("noVoice"), "aria-label": "▶ " + text, disabled: !CAPS.voice, onclick: () => say(text), html: ICON_SAY });
let HW = null;
function hanziWriter() { if (!HW) HW = new Promise((res, rej) => { if (window.HanziWriter) return res(window.HanziWriter); const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/hanzi-writer@3.7.2/dist/hanzi-writer.min.js"; s.onload = () => res(window.HanziWriter); s.onerror = () => { CAPS.writer = false; HW = null; rej(new Error("hw")); }; document.head.append(s); }); return HW; }
function strokeDialog(ch) {
  const box = el("div", { class: "tzg big" }), dlg = el("dialog", { class: "strokes" }, el("div", { class: "row between" }, el("b", { class: "hz" }, ch), el("button", { class: "btn ghost small", onclick: () => dlg.close() }, "✕")), box);
  document.body.append(dlg); dlg.showModal(); dlg.addEventListener("close", () => dlg.remove());
  hanziWriter().then(H => { const w = H.create(box, ch, { width: 220, height: 220, padding: 10, strokeColor: getComputedStyle(document.body).getPropertyValue("--ink").trim() || "#1f2623", radicalColor: "#b8322a", delayBetweenLoops: 800 }); w.loopCharacterAnimation(); }).catch(() => box.append(el("p", { class: "muted" }, t("writeFallback"))));
}

/* ---------- navegação ---------- */
let ROUTE = { page: S.started ? "map" : "home" }, TAB = {}, CUR = null, RECENT = [], CHAT = [];
function go(page, arg) { ROUTE = { page, arg }; CUR = null; CHAT = []; render(); window.scrollTo(0, 0); }
function header() {
  const r = GAME.role(S.xpTotal);
  const nav = [["home", "🏠"], ["map", "🗺️"], ["grammar", "📝"], ["course", "📘"], ["report", "📊"], ["shop", "🛒"], ["settings", "⚙️"]];
  return el("header", { class: "top" },
    el("div", { class: "bar" },
      el("button", { class: "brand", onclick: () => go("home") }, el("span", { class: "hz logo" }, "汉"), el("b", {}, "Wikawise")),
      el("div", { class: "hud" }, el("span", { title: t("xp") }, "✨ " + S.xp), el("span", { title: t("streak") }, "🔥 " + S.streak), el("span", {}, (S.title ? (SHOP.find(x => x.id === S.title) || {}).icon + " " : "") + t("role")[r]), el("span", { title: t("mode") }, MODE_ICON[S.mode]))),
    el("nav", { class: "tabs", "aria-label": "Wikawise" }, nav.map(([p, ic]) => el("button", { "aria-current": ROUTE.page === p ? "page" : null, onclick: () => go(p) }, el("span", { "aria-hidden": "true" }, ic), " ", t(p)))));
}
function render() {
  document.documentElement.setAttribute("data-theme", S.theme === "auto" ? "" : S.theme);
  document.documentElement.lang = S.lang === "pt" ? "pt-BR" : "en";
  document.body.classList.toggle("nopy", !S.py);
  const app = $app(); app.innerHTML = ""; app.append(header());
  const main = el("main", {}); app.append(main);
  const P = { home: pHome, map: pMap, course: pCourse, grammar: pGrammar, report: pReport, shop: pShop, settings: pSettings, skill: pSkill }[ROUTE.page] || pHome;
  P(main);
}

/* ---------- início ---------- */
function pHome(m) {
  const nG = DATA.gItems.length, nU = DATA.levels.reduce((a, L) => a + L.units.length, 0);
  const played = S.log.length > 0;
  m.append(
    el("section", { class: "hero" },
      el("div", { class: "hero-grid", "aria-hidden": "true" }, [..."汉语水平考试"].map(c => el("div", { class: "tzg" }, el("span", { class: "hz" }, c)))),
      el("h1", {}, "Wikawise"),
      el("p", { class: "lead" }, t("tagline")),
      el("p", { class: "muted" }, t("stats", { w: DATA.words.length, u: nU, g: nG, c: 13 })),
      el("div", { class: "row" }, el("button", { class: "btn", onclick: () => { S.started = true; save(); go("map"); } }, played ? t("continue") : t("start")), el("button", { class: "btn ghost", onclick: () => go("course") }, "📘 " + t("course")))),
    el("section", { class: "pillars" },
      [["stages", "三等九级"], ["dims", "四维基准"], ["skills", "五项技能"], ["tracking", "KT"]].map(([k, zh]) => el("article", {}, el("h3", {}, t(k), " ", el("span", { class: "hz dim" }, zh)), el("p", {}, t(k + "Txt"))))),
    el("section", { class: "levels-strip" }, DATA.levels.map(L => { const st = DATA.standards[L.lv]; return el("button", { class: "lvl", onclick: () => { S.started = true; save(); go("map", L.lv); } }, el("b", {}, "HSK " + L.lv), el("span", {}, st.cum + " " + t("words")), el("span", { class: "muted" }, L.chars.length + " 字 · ✍️ " + ((DATA.writing[L.lv] || []).length))); })),
    el("p", { class: "muted small" }, t("dataNote")));
}

/* ---------- mapa ---------- */
function unitChip(u) {
  const st = status(u.id), m = M(u.id);
  return el("button", { class: "unit " + st, onclick: () => go("skill", u.id), "aria-label": `${t("unit")} ${u.n}: ${pct(m)}` },
    el("span", { class: "n" }, st === "locked" ? "🔒" : u.n), el("span", { class: "ring", style: `--p:${Math.round(m * 100)}` }), el("span", { class: "pc" }, st === "locked" ? "" : pct(m)));
}
function pMap(m) {
  const focus = ROUTE.arg;
  DATA.levels.forEach(L => {
    const open = E.levelOpen(S, L.lv, M), st = DATA.standards[L.lv];
    const stage = L.lv <= 3 ? (S.lang === "pt" ? "Elementar" : "Elementary") : (S.lang === "pt" ? "Intermediário" : "Intermediate");
    const sec = el("section", { class: "level" + (open ? "" : " closed"), id: "lv" + L.lv },
      el("div", { class: "level-h" }, el("h2", {}, "HSK " + L.lv), el("span", { class: "tag" }, stage),
        el("span", { class: "muted" }, `${st.words} ${t("words")} (${st.cum}) · ${L.chars.length} 字 · ✍️ ${(DATA.writing[L.lv] || []).length}` + (st.gram ? ` · ${st.gram} ${t("grammar").toLowerCase()}` : ""))),
      open ? null : el("p", { class: "muted" }, t("lockedLevel", { l: L.lv - 1 }), " ", S.inv.key > 0 ? el("button", { class: "btn small", onclick: () => { S.inv.key--; S.keyed["L" + L.lv] = true; save(); render(); } }, "🗝️ " + t("useKey", { n: S.inv.key })) : null),
      el("div", { class: "units" }, L.units.map(unitChip)));
    m.append(sec);
  });
  if (focus) setTimeout(() => { const n = document.getElementById("lv" + focus); if (n) n.scrollIntoView({ block: "start" }); }, 0);
}

/* ---------- gramática ---------- */
function pGrammar(m) {
  m.append(el("h2", {}, "📝 " + t("grammar")), el("p", { class: "muted" }, t("gramTxt")));
  DATA.levels.forEach(L => {
    const s = "g" + L.lv, pts = (DATA.grammarPT[L.lv] || []).length, its = E.grammarItems(L.lv).length, st = status(s), has = S.skills[s] && S.skills[s].n;
    const off = DATA.standards[L.lv].gram || (DATA.grammarOfficial[L.lv] || []).length;
    m.append(el("button", { class: "lesson gramcard " + st, onclick: () => go("skill", s) },
      el("span", { class: "ln hz" }, "语"),
      el("span", {}, el("b", {}, "HSK " + L.lv), " ", st === "locked" ? el("span", { class: "tag" }, "🔒 " + t("locked")) : null, el("br"),
        el("span", { class: "muted small" }, pts ? t("gramCounts", { p: pts, i: its }) : t("gramPending"))),
      el("span", { class: "pc" }, has ? pct(M(s)) : "—")));
  });
  m.append(el("p", { class: "muted small" }, t("gramNote")));
}

/* ---------- curso ---------- */
function pCourse(m) {
  const C = DATA.course;
  m.append(el("h2", {}, "📘 " + t("course")), el("p", { class: "muted" }, t("courseTxt")), el("p", { class: "muted small" }, t("coursePDF")),
    el("div", { class: "course-list" }, C.lessons.map(l => { const s = "c" + pad(l.n), mm = M(s), has = S.skills[s] && S.skills[s].n; return el("button", { class: "lesson", onclick: () => go("skill", s) }, el("span", { class: "ln" }, l.n === 13 ? "+" : l.n === 14 ? "♪" : l.n), el("span", {}, el("b", {}, l.n >= 13 ? l.t : t("lessonOf", { n: l.n })), el("br"), l.n >= 13 ? el("span", { class: "muted small" }, l.n === 13 ? t("extraHsk") : t("extraMusic")) : l.t), el("span", { class: "pc" }, has ? pct(mm) : "—")); })));
}

/* ---------- página de habilidade (unidade, gramática, aula) ---------- */
function pSkill(m) {
  const s = ROUTE.arg, kind = s[0], lv = kind === "h" ? +s[1] : kind === "g" ? +s.slice(1) : E.COURSE_LV(+s.slice(1));
  const open = E.skillOpen(S, s, M);
  const items = E.itemsFor(s, CAPS);
  const tabs = kind === "h" ? ["practice", "wordsH", "support"] : kind === "g" ? [].concat((DATA.grammarPT[lv] || []).length ? ["theory"] : [], items.length ? ["practice"] : [], ["official", "support"]) : ["theory", "practice"].concat(DATA.course.read.some(r => r.a === +s.slice(1)) ? ["reading"] : []).concat(["vocab"]);
  if (!TAB[s] || !tabs.includes(TAB[s])) TAB[s] = kind === "h" ? (open ? "practice" : "wordsH") : tabs[0];
  const title = kind === "c" ? (+s.slice(1) >= 13 ? "" : t("lessonOf", { n: +s.slice(1) }) + " — ") + DATA.course.lessons.find(l => l.n === +s.slice(1)).t : skillName(s);
  m.append(el("div", { class: "row between" }, el("button", { class: "btn ghost small", onclick: () => go(kind === "c" ? "course" : kind === "g" ? "grammar" : "map", kind === "h" ? lv : null) }, "← " + t("back")),
    el("div", { class: "meter" }, el("span", {}, t("mastery") + " " + pct(M(s))), el("div", { class: "track" }, el("div", { class: "fill", style: `width:${pct(M(s))}` })))),
    el("h2", {}, title));
  if (!open) {
    m.append(el("p", { class: "note" }, kind === "h" && E.levelOpen(S, lv, M) ? t("lockedUnit") : t("lockedLevel", { l: lv - 1 }), " ",
      S.inv.key > 0 ? el("button", { class: "btn small", onclick: () => { S.inv.key--; S.keyed[s] = true; if (!E.levelOpen(S, lv, M)) S.keyed["L" + lv] = true; save(); render(); } }, "🗝️ " + t("useKey", { n: S.inv.key })) : null));
  }
  m.append(el("div", { class: "subtabs", role: "tablist" }, tabs.map(k => el("button", { role: "tab", "aria-selected": TAB[s] === k, disabled: k === "practice" && !open, onclick: () => { TAB[s] = k; CUR = null; render(); } }, t(k)))));
  const box = el("section", { class: "tabbody" }); m.append(box);
  const tab = TAB[s];
  if (tab === "practice") practice(box, s, items);
  else if (tab === "wordsH") wordsTab(box, E.UNITS[s].w);
  else if (tab === "support") supportTab(box, lv);
  else if (tab === "official") officialTab(box, lv);
  else if (tab === "theory") kind === "g" ? grammarPoints(box, lv) : courseTheory(box, +s.slice(1));
  else if (tab === "reading") courseReading(box, +s.slice(1));
  else if (tab === "vocab") wordsTab(box, DATA.course.vocab.filter(v => v.a === +s.slice(1)).map(v => v.zh), DATA.course.vocab.filter(v => v.a === +s.slice(1)));
}

function wordsTab(box, list, courseVocab) {
  const rows = list.map((z, i) => {
    const w = E.WORD[z], cv = courseVocab && courseVocab[i];
    const py = w ? w.p : cv.py, gl = cv && S.lang === "pt" ? cv.pt : w ? E.gloss(w, S.lang) : cv.pt;
    const fb = w && !cv && E.glossIsFallback(w, S.lang);
    return el("tr", {}, el("td", {}, el("button", { class: "hzbtn hz", title: t("strokes"), onclick: () => strokeDialog([...z][0]) }, z)), el("td", { class: "py" }, py), el("td", {}, gl, fb ? el("span", { class: "tag plain", title: t("glossFallback") }, "en") : null), el("td", { class: "cls" }, w ? w.c.join(", ") : ""), el("td", {}, sayBtn(z)));
  });
  box.append(el("div", { class: "scroll" }, el("table", { class: "words" }, el("tbody", {}, rows))), el("p", { class: "muted small" }, t("strokes") + ": " + (S.lang === "pt" ? "toque no caractere." : "tap the character.")));
}
function supportTab(box, lv) {
  const links = [["matOfficial", "https://github.com/leonsilicon/hsk3.1/tree/main/data/HSK3.1"], ["matCTI", "https://www.chinesetest.cn"], ["matAudio", "https://www.baulchino.com/hsk-audios"], ["matMock", "https://www.baulchino.com/hsk-mock-test"], ["matBooks", "https://www.baulchino.com/libros-hsk"]];
  box.append(el("h3", {}, t("material") + " · HSK " + lv), el("ul", { class: "links" }, links.map(([k, u]) => el("li", {}, el("a", { href: u, target: "_blank", rel: "noopener" }, t(k))))), el("p", { class: "note" }, t("matVersion")), el("p", { class: "muted small" }, t("matRights")));
}
function officialTab(box, lv) {
  box.append(el("p", { class: "muted" }, t("officialNote")), el("ul", { class: "official" }, (DATA.grammarOfficial[lv] || []).map(l => el("li", { class: "hz-ui" }, l))));
}
function grammarPoints(box, lv) {
  (DATA.grammarPT[lv] || []).forEach(g => box.append(el("div", { class: "rule" }, el("div", {}, el("b", {}, g.t), el("p", { class: "muted" }, g.e), el("p", { class: "ex" }, el("span", { class: "hz" }, g.zh), el("span", { class: "py pyo" }, g.py), el("span", {}, g.pt)), g.aula ? el("button", { class: "linkish", onclick: () => go("skill", "c" + pad(g.aula)) }, t("coveredIn", { n: g.aula })) : null), sayBtn(g.zh))));
}
function courseTheory(box, n) {
  (DATA.course.theory[n] || []).forEach(r => box.append(el("div", { class: "rule" }, el("div", {}, el("b", {}, r.s), el("p", { class: "muted" }, r.u), el("p", { class: "ex" }, el("span", { class: "hz" }, r.zh), el("span", { class: "py pyo" }, r.py), el("span", {}, r.pt))), sayBtn(r.zh))));
  if (DATA.course.notes[n]) box.append(el("p", { class: "note" }, DATA.course.notes[n]));
}
function courseReading(box, n) {
  DATA.course.read.filter(r => r.a === n).forEach(r => {
    box.append(el("h3", {}, r.t), el("div", { class: "row" }, el("button", { class: "btn ghost small", disabled: !CAPS.voice, onclick: () => { let i = 0; const go2 = () => { if (i < r.lines.length) say(r.lines[i++].zh, go2); }; go2(); } }, "▶ " + (S.lang === "pt" ? "Ouvir o diálogo" : "Play dialogue"))),
      el("ol", { class: "dlg" }, r.lines.map(l => el("li", {}, el("span", { class: "sp " + l.sp }, l.sp), el("div", {}, el("span", { class: "hz" }, l.zh), el("div", { class: "py pyo" }, l.py)), sayBtn(l.zh)))),
      el("p", { class: "muted small" }, S.lang === "pt" ? "As perguntas deste diálogo aparecem na aba Praticar." : "Questions about this dialogue appear in the Practice tab."));
  });
}

/* ---------- prática adaptativa ---------- */
function practice(box, s, items) {
  if (!items.length) { box.append(el("p", { class: "muted" }, "—")); return; }
  if (!CUR || CUR.skill !== s) {
    const it = E.pick(items, M(s), RECENT, S.solved);
    CUR = { skill: s, it, seed: Date.now(), done: false, hint: false, removed: [], order: [], picked: null };
    RECENT.push(it.id); if (RECENT.length > 12) RECENT.shift();
  }
  const { it } = CUR, w = E.wordOf(it);
  const card = el("div", { class: "q" });
  card.append(el("div", { class: "kind" }, t("kind_" + it.type), el("span", { class: "tag plain" }, t("dim_" + it.dim)), el("span", { class: "tag plain" }, "d" + it.d)));
  const fb = el("div", { class: "feedback", "aria-live": "polite" });
  const finish = (ok, extra) => {
    if (CUR.done) return; CUR.done = true;
    const x = record(it, ok, { hint: CUR.hint, c: extra && extra.c != null ? extra.c : CUR.fallbackC, extra: extra && extra.log });
    fb.className = "feedback show " + (ok ? "ok" : "no");
    fb.innerHTML = "";
    fb.append(el("b", {}, ok ? t("correct") : t("wrongAns", { a: it.type === "read" ? E.gloss(w, S.lang) : E.answerKey(it) })), " ", el("span", { class: "xpd" }, (x >= 0 ? "+" : "") + x + " XP"));
    if (it.type === "gap") fb.append(el("div", {}, it.g.ex), el("div", { class: "hz full" }, it.g.full), el("div", { class: "py" }, it.g.py));
    else if (it.type === "order") fb.append(el("div", { class: "hz full" }, it.s.zh), el("div", { class: "py" }, it.s.py));
    else if (w) fb.append(el("div", { class: "full" }, el("span", { class: "hz" }, w.z), " ", el("span", { class: "py" }, w.p), " — ", E.gloss(w, S.lang)));
    if (extra && extra.msg) fb.append(el("div", { class: "muted" }, extra.msg));
    card.querySelectorAll("button.opt,.tok,.act").forEach(b => b.disabled = true);
    if (w) say(w.z); else if (it.type === "gap") say(it.g.full); else if (it.type === "order") say(it.s.zh);
    nextRow.hidden = false; nextRow.querySelector("button").focus();
    render2Meter(s);
  };
  const nextRow = el("div", { class: "row end", hidden: true }, el("button", { class: "btn", onclick: () => { CUR = null; CHAT = []; render(); } }, t("next") + " →"));

  /* corpo por tipo */
  const mc = (prompt, opts) => {
    card.append(prompt);
    const key = E.answerKey(it);
    const grid = el("div", { class: "opts" });
    opts.forEach(o => { if (CUR.removed.includes(o.key)) return; grid.append(el("button", { class: "opt", onclick: e => { const ok = o.key === key; grid.querySelectorAll(".opt").forEach(b => { if (b.dataset.k === key) b.classList.add("ok"); }); if (!ok) e.currentTarget.classList.add("no"); finish(ok); }, "data-k": o.key }, el("span", { class: /[\u4e00-\u9fff]/.test(o.label) ? "hz" : "" }, o.label), o.py && S.py ? el("small", { class: "py" }, o.py) : null)); });
    card.append(grid);
    if (MODES[S.mode].hint && S.inv.lens > 0 && !CUR.done && opts.length > 2) card.append(el("button", { class: "btn ghost small act", onclick: () => { S.inv.lens--; CUR.hint = true; CUR.removed = E.shuffle(opts.filter(o => o.key !== key)).slice(0, 2).map(o => o.key); save(); render(); } }, "🔍 " + t("lens", { n: S.inv.lens })));
    if (CUR.hint) card.append(el("p", { class: "muted small" }, t("lensUsed")));
  };
  const opts = E.options(it, S.lang, CUR.seed);
  if (it.type === "read") mc(el("div", { class: "prompt center" }, el("div", { class: "tzg-row" }, [...w.z].map(c => el("div", { class: "tzg" }, el("span", { class: "hz" }, c)))), el("div", { class: "py pyo" }, w.p)), opts);
  else if (it.type === "pinyin") mc(el("div", { class: "prompt center" }, el("div", { class: "tzg-row" }, [...w.z].map(c => el("div", { class: "tzg" }, el("span", { class: "hz" }, c)))), el("div", { class: "muted" }, E.gloss(w, S.lang))), opts);
  else if (it.type === "translate") mc(el("div", { class: "prompt center big-gloss" }, E.gloss(w, S.lang)), opts.map(o => ({ ...o, py: null })));
  else if (it.type === "listen") { mc(el("div", { class: "prompt center" }, el("button", { class: "btn act", onclick: () => say(w.z) }, "▶ " + t("playAgain"))), opts.map(o => ({ ...o, py: null }))); if (!CUR.played) { CUR.played = true; setTimeout(() => say(w.z), 300); } }
  else if (it.type === "gap") mc(el("div", { class: "prompt" }, el("span", { class: "hz" }, it.g.s)), opts);
  else if (it.type === "rq") { const r = DATA.course.read[it.r]; card.append(el("details", { class: "ctx" }, el("summary", {}, r.t), el("ol", { class: "dlg" }, r.lines.map(l => el("li", {}, el("span", { class: "sp " + l.sp }, l.sp), el("div", {}, el("span", { class: "hz" }, l.zh), el("div", { class: "py pyo" }, l.py))))))); mc(el("div", { class: "prompt" }, it.q.q), opts); }
  else if (it.type === "order") orderBody(card, it, finish);
  else if (it.type === "speak") speakBody(card, it, w, finish);
  else if (it.type === "write") writeBody(card, it, w, opts, finish, mc);
  card.append(fb, nextRow);
  box.append(el("p", { class: "muted small" }, S.lang === "pt" ? "O próximo exercício é escolhido pelo seu domínio atual." : "The next exercise is chosen from your current mastery."), card);
  tutorPanel(box, it);
}
function render2Meter(s) { const f = document.querySelector(".meter .fill"), l = document.querySelector(".meter span"); if (f) f.style.width = pct(M(s)); if (l) l.textContent = t("mastery") + " " + pct(M(s)); const h = document.querySelector(".hud"); if (h) { h.children[0].textContent = "✨ " + S.xp; h.children[1].textContent = "🔥 " + S.streak; } }
function orderBody(card, it, finish) {
  if (!CUR.pool) CUR.pool = E.shuffle(it.s.t.map((x, i) => ({ x, i })));
  card.append(el("div", { class: "prompt" }, it.s.pt));
  const slot = el("div", { class: "slot" }), pool = el("div", { class: "pool" });
  const draw = () => {
    slot.innerHTML = ""; pool.innerHTML = "";
    if (!CUR.order.length) slot.append(el("span", { class: "muted" }, t("tapWords")));
    CUR.order.forEach((o, k) => slot.append(el("button", { class: "tok hz", disabled: CUR.done, onclick: () => { CUR.order.splice(k, 1); draw(); } }, o.x)));
    CUR.pool.filter(p => !CUR.order.includes(p)).forEach(p => pool.append(el("button", { class: "tok hz", disabled: CUR.done, onclick: () => { CUR.order.push(p); draw(); } }, p.x)));
    chk.disabled = CUR.done || CUR.order.length !== it.s.t.length;
  };
  const chk = el("button", { class: "btn act", onclick: () => { const got = CUR.order.map(o => o.x).join(""); finish(got === it.s.t.join("") || (it.s.alt && got === it.s.alt)); } }, t("check"));
  card.append(slot, pool, el("div", { class: "row end" }, el("button", { class: "btn ghost act", onclick: () => { CUR.order = []; draw(); } }, t("clear")), chk));
  draw();
}
function speakBody(card, it, w, finish) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const heard = el("p", { class: "muted" });
  card.append(el("div", { class: "prompt center" }, el("div", { class: "tzg-row" }, [...w.z].map(c => el("div", { class: "tzg" }, el("span", { class: "hz" }, c)))), el("div", { class: "py pyo" }, w.p), el("div", { class: "muted" }, E.gloss(w, S.lang))));
  const btn = el("button", { class: "btn act", onclick: () => {
    const r = new SR(); r.lang = "zh-CN"; r.maxAlternatives = 5; r.interimResults = false; btn.textContent = t("speakListening"); btn.disabled = true;
    r.onresult = e => { const alts = [...e.results[0]].map(a => a.transcript.replace(/[\s，。？！,.?!]/g, "")); heard.textContent = t("speakHeard", { x: alts[0] || "" }); finish(alts.some(a => a.includes(w.z)), { log: { heard: alts.slice(0, 3) }, msg: t("speakHeard", { x: alts[0] || "" }) }); };
    r.onerror = r.onend = () => { if (!CUR.done) { btn.disabled = false; btn.textContent = t("speakStart"); heard.textContent = t("speakNone"); } };
    try { r.start(); } catch (e) { btn.disabled = false; }
  } }, "🎙️ " + t("speakStart"));
  card.append(el("div", { class: "row center" }, el("button", { class: "btn ghost act", onclick: () => say(w.z) }, "▶"), btn, el("button", { class: "btn ghost act", onclick: () => { CUR = null; render(); } }, t("skip"))), heard);
}
function writeBody(card, it, w, opts, finish, mc) {
  const prompt = el("div", { class: "prompt center" }, el("div", { class: "py big-gloss" }, w.p), el("div", { class: "muted" }, E.gloss(w, S.lang), " · ", el("span", { class: "hz" }, w.z.replace(it.ch, "＿"))));
  if (!CAPS.writer || CUR.forceMC) { CUR.fallbackC = .25; mc(el("div", {}, prompt, el("p", { class: "muted small" }, t("writeFallback"))), opts); return; }
  const target = el("div", { class: "tzg big" });
  card.append(prompt, el("div", { class: "row center" }, target), el("p", { class: "muted small" }, t("writeHint")));
  hanziWriter().then(H => H.loadCharacterData(it.ch).then(data => {
    const n = data.strokes.length;
    const wr = H.create(target, it.ch, { width: 240, height: 240, padding: 12, showCharacter: false, showOutline: S.mode === "normal", strokeColor: "#2e6b57", drawingColor: getComputedStyle(document.body).getPropertyValue("--ink").trim() || "#1f2623", showHintAfterMisses: 3 });
    wr.quiz({ onComplete: sum => { const miss = sum.totalMistakes, ok = miss <= Math.max(1, Math.floor(n * .25)); finish(ok, { log: { mistakes: miss, strokes: n }, msg: t("writeMistakes", { n: miss }) }); } });
  })).catch(() => { CAPS.writer = false; if (CUR && CUR.it === it && !CUR.done) { CUR.forceMC = true; render(); } });
}

/* ---------- tutor de IA ---------- */
function tutorPanel(box, it) {
  const w = E.wordOf(it);
  const panel = el("details", { class: "tutor" }, el("summary", {}, "🤖 " + t("tutor")));
  if (!LLM.ready()) { panel.append(el("p", { class: "muted" }, t("tutorNoKey"), " ", el("button", { class: "linkish", onclick: () => go("settings") }, t("settings")))); box.append(panel); return; }
  const log = el("div", { class: "chat" }), inp = el("textarea", { rows: 2, placeholder: t("tutorAsk") }), st = el("p", { class: "muted small" });
  const draw = () => { log.innerHTML = ""; CHAT.forEach(m => log.append(el("div", { class: "msg " + m.role }, m.content))); };
  const ctx = () => {
    const unitWords = it.skill[0] === "h" ? E.UNITS[it.skill].w.slice(0, 50).map(z => `${z} ${E.WORD[z].p} (${E.gloss(E.WORD[z], S.lang)})`).join("; ") : "";
    const item = it.type === "gap" ? `lacuna: ${it.g.s} opções: ${it.g.o.join(" / ")}` : it.type === "order" ? `montar: ${it.s.pt}` : it.type === "rq" ? `pergunta: ${it.q.q}` : `palavra-alvo: ${w ? w.z + " " + w.p + " " + E.gloss(w, S.lang) : ""}`;
    return `Você é tutor de mandarim no Wikawise, um treino adaptativo para o HSK 3.0 (nível ${it.lv}). Responda em ${S.lang === "pt" ? "português do Brasil" : "English"}, curto, com analogias práticas e exemplos com caracteres, pinyin e tradução. ` +
      `Exercício atual (${t("kind_" + it.type)}, dimensão ${it.dim}): ${item}. Já respondido: ${CUR && CUR.done ? "sim" : "não"}. ` +
      (CUR && CUR.done ? `Resposta certa: ${E.answerKey(it)}. Explique por que é essa. ` : `Não revele a resposta; dê pistas e faça uma pergunta que leve o estudante a descobrir. `) +
      (unitWords ? `Palavras da unidade: ${unitWords}.` : "");
  };
  const send = async () => { const q = inp.value.trim(); if (!q) return; CHAT.push({ role: "user", content: q }); inp.value = ""; draw(); st.textContent = "…";
    try { const a = await LLM.chat(ctx(), CHAT, s => { st.textContent = s.wait ? t("tutorWait", { m: s.model, a: s.attempt }) : t("tutorFallback", { m: s.model }); }); CHAT.push({ role: "assistant", content: a }); st.textContent = ""; } catch (e) { st.textContent = "⚠️ " + e.message; } draw(); };
  panel.append(log, inp, el("div", { class: "row end" }, el("button", { class: "btn small", onclick: send }, t("tutorSend"))), st);
  draw(); box.append(panel);
}

/* ---------- relatório ---------- */
function statsOf(skill) { const rows = S.log.filter(l => l.skill === skill); return { n: rows.length, acc: rows.length ? rows.filter(l => l.ok).length / rows.length : null }; }
function pReport(m) {
  const all = S.log, acc = all.length ? all.filter(l => l.ok).length / all.length : null;
  m.append(el("div", { class: "row between noprint" }, el("h2", {}, "📊 " + t("repTitle")), el("div", { class: "row" }, el("button", { class: "btn ghost small", onclick: () => window.print() }, t("print")), el("button", { class: "btn small", onclick: exportJSON }, t("export")))),
    el("p", {}, el("b", {}, S.name || "—"), " · ", new Date().toLocaleDateString(S.lang === "pt" ? "pt-BR" : "en"), " · ", t("role")[GAME.role(S.xpTotal)], " · ✨ " + S.xpTotal + " XP"),
    el("div", { class: "stats" }, el("div", {}, el("b", {}, all.length), t("answers")), el("div", {}, el("b", {}, acc == null ? "—" : pct(acc)), t("accuracy")), el("div", {}, el("b", {}, Object.keys(S.skills).filter(k => M(k) >= KT.master(PILOT)).length), t("mastered"))));
  /* habilidades e dimensões por nível */
  const dimsT = el("table", { class: "grid" }, el("thead", {}, el("tr", {}, el("th", {}, t("colSkill")), DATA.levels.map(L => el("th", {}, "HSK " + L.lv)))),
    el("tbody", {}, E.DIMS.map(d => el("tr", {}, el("td", {}, t("dim_" + d)), DATA.levels.map(L => { const tr = S.dims[L.lv + ":" + d]; return el("td", {}, tr && tr.n ? el("span", { class: "cellbar", style: `--p:${Math.round(KT.mastery(tr, PILOT) * 100)}` }, pct(KT.mastery(tr, PILOT)), el("small", {}, " n=" + tr.n)) : el("span", { class: "muted" }, "—")); })))));
  m.append(el("h3", {}, t("repSkills")), el("div", { class: "scroll" }, dimsT));
  if (!CAPS.voice) m.append(el("p", { class: "muted small" }, t("noVoice"))); if (!CAPS.mic) m.append(el("p", { class: "muted small" }, t("noMic")));
  /* unidades por nível */
  m.append(el("h3", {}, t("repLevels")));
  DATA.levels.forEach(L => {
    const ids = L.units.map(u => u.id).concat(["g" + L.lv]); const touched = ids.filter(id => S.skills[id] && S.skills[id].n);
    if (!touched.length && !E.levelOpen(S, L.lv, M)) return;
    m.append(el("h4", {}, "HSK " + L.lv), el("div", { class: "scroll" }, el("table", { class: "grid" }, el("thead", {}, el("tr", {}, ["colSkill", "colN", "colAcc", "colMastery", "colStatus"].map(k => el("th", {}, t(k))))),
      el("tbody", {}, ids.map(id => { const s = statsOf(id), stt = status(id); return el("tr", { class: stt }, el("td", {}, skillName(id)), el("td", {}, s.n), el("td", {}, s.acc == null ? "—" : pct(s.acc)), el("td", {}, S.skills[id] && S.skills[id].n ? pct(M(id)) : t("notYet")), el("td", {}, t("st_" + stt))); })))));
  });
  /* curso */
  const cids = DATA.course.lessons.map(l => "c" + pad(l.n)).filter(id => S.skills[id] && S.skills[id].n);
  if (cids.length) m.append(el("h3", {}, t("repCourse")), el("div", { class: "scroll" }, el("table", { class: "grid" }, el("tbody", {}, cids.map(id => { const s = statsOf(id); return el("tr", {}, el("td", {}, skillName(id)), el("td", {}, s.n), el("td", {}, pct(s.acc)), el("td", {}, pct(M(id)))); })))));
  /* o que falta */
  const todo = [];
  DATA.levels.forEach(L => L.units.forEach(u => { if (status(u.id) === "locked") return; const miss = u.w.filter(z => !Object.keys(S.solved).some(k => k.startsWith(u.id + ":" + z + ":"))).length; if (S.skills[u.id] && miss) todo.push(el("li", {}, skillName(u.id) + ": " + t("wordsLeft", { n: miss }))); }));
  m.append(el("h3", {}, t("repTodo")), todo.length ? el("ul", {}, todo.slice(0, 20)) : el("p", { class: "muted" }, t("nothingLeft")));
  /* modelos */
  m.append(el("h3", {}, t("repModels")), el("div", { class: "scroll" }, el("table", { class: "grid" }, el("thead", {}, el("tr", {}, ["", "n", "Brier ↓", "AUC ↑", "Acc ↑"].map(x => el("th", {}, x)))),
    el("tbody", {}, KT.IDS.map(k => { const sc = KT.score(all, k); return el("tr", {}, el("td", {}, k + (k === PILOT ? " (piloto)" : "")), el("td", {}, sc ? sc.n : 0), el("td", {}, sc ? sc.brier.toFixed(3) : "—"), el("td", {}, sc && sc.auc != null ? sc.auc.toFixed(3) : "—"), el("td", {}, sc ? pct(sc.acc) : "—")); })))));
}
function exportJSON() {
  const data = { app: "Wikawise", version: 1, exported: new Date().toISOString(), student: S.name || null, pilot: PILOT, settings: { lang: S.lang, mode: S.mode, free: S.free },
    mastery: Object.fromEntries(Object.keys(S.skills).map(k => [k, +M(k).toFixed(4)])), dims: Object.fromEntries(Object.keys(S.dims).map(k => [k, +KT.mastery(S.dims[k], PILOT).toFixed(4)])), log: S.log };
  const a = el("a", { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" })), download: `wikawise-${(S.name || "log").replace(/\W+/g, "_")}-${Date.now()}.json` }); document.body.append(a); a.click(); a.remove();
}

/* ---------- loja ---------- */
function pShop(m) {
  m.append(el("h2", {}, "🛒 " + t("shop")), el("p", { class: "muted" }, t("shopTxt"), " ✨ " + S.xp + " XP"));
  const msg = el("p", { class: "muted", "aria-live": "polite" });
  m.append(el("div", { class: "shop" }, SHOP.map(x => {
    const own = x.kind === "title" && S.titles.includes(x.id);
    return el("article", {}, el("div", { class: "ic" + (x.kind === "title" ? " hz" : "") }, x.icon), el("p", {}, t("shop_" + x.id)), x.kind === "power" ? el("small", { class: "muted" }, "× " + (x.id === "boost" ? S.boost : S.inv[x.id])) : null,
      own ? el("button", { class: "btn ghost small", onclick: () => { S.title = S.title === x.id ? null : x.id; save(); render(); } }, S.title === x.id ? "✓ " + t("owned") : t("equip"))
        : el("button", { class: "btn small", onclick: () => { if (S.xp < x.cost) { msg.textContent = t("notEnough"); return; } S.xp -= x.cost; if (x.kind === "title") S.titles.push(x.id); else if (x.id === "boost") S.boost += 5; else S.inv[x.id]++; save(); render(); } }, t("buy") + " · " + x.cost + " XP"));
  })), msg);
}

/* ---------- ajustes ---------- */
function pSettings(m) {
  const sel = (label, val, opts, on) => el("label", { class: "field" }, el("span", {}, label), el("select", { onchange: e => on(e.target.value) }, opts.map(([v, l]) => el("option", { value: v, selected: v === val }, l))));
  const chk = (label, val, on) => el("label", { class: "check" }, el("input", { type: "checkbox", checked: val, onchange: e => on(e.target.checked) }), el("span", {}, label));
  m.append(el("h2", {}, "⚙️ " + t("settings")),
    sel(t("lang"), S.lang, [["pt", "Português"], ["en", "English"]], v => { S.lang = v; save(); render(); }),
    sel(t("mode"), S.mode, Object.keys(MODES).map(k => [k, MODE_ICON[k] + " " + t("mode_" + k)]), v => { S.mode = v; save(); render(); }),
    sel(t("theme"), S.theme, [["auto", t("theme_auto")], ["light", t("theme_light")], ["dark", t("theme_dark")]], v => { S.theme = v; save(); render(); }),
    chk(t("showPy"), S.py, v => { S.py = v; save(); render(); }), chk(t("freeTxt"), S.free, v => { S.free = v; save(); render(); }),
    el("label", { class: "field" }, el("span", {}, t("name")), el("input", { value: S.name, onchange: e => { S.name = e.target.value; save(); } })));
  m.append(el("h3", {}, t("capsTitle")), el("ul", {}, el("li", {}, (CAPS.voice ? "✅ " : "❌ ") + (CAPS.voice ? t("voiceOk") : t("noVoice"))), el("li", {}, (CAPS.mic ? "✅ " : "❌ ") + (CAPS.mic ? t("micOk") : t("noMic")))));
  const c = LLM.cfg(), ok = el("span", { class: "muted" });
  const pv = el("select", {}, Object.entries(PROVIDERS).map(([k, p]) => el("option", { value: k, selected: k === c.provider }, p.name)));
  const key = el("input", { type: "password", value: c.key, autocomplete: "off" }), mod = el("input", { value: c.model, placeholder: "" }), url = el("input", { value: c.url, placeholder: "https://…/v1/chat/completions" });
  m.append(el("h3", {}, "🤖 " + t("llmH")), el("label", { class: "field" }, el("span", {}, t("provider")), pv), el("label", { class: "field" }, el("span", {}, t("apiKey")), key),
    el("label", { class: "field" }, el("span", {}, t("model")), mod), el("label", { class: "field" }, el("span", {}, t("url")), url), el("p", { class: "muted small" }, t("keyNote")),
    el("div", { class: "row" }, el("button", { class: "btn small", onclick: () => { LLM.save({ provider: pv.value, key: key.value.trim(), model: mod.value.trim(), url: url.value.trim() }); ok.textContent = t("saved"); } }, t("save")), ok),
    el("hr"), el("button", { class: "btn danger small", onclick: () => { if (confirm(t("resetConfirm"))) { const lang = S.lang; S = fresh(); S.lang = lang; save(); go("home"); } } }, t("reset")));
}

render();
