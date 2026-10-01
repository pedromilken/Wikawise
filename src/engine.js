/* Wikawise - motor sem DOM: gera itens a partir do vocabulário oficial, escolhe o próximo item, decide desbloqueios e priors.
   Os itens seguem os princípios do HSK 3.0: quatro dimensões (音节 sílabas, 汉字 caracteres, 词汇 vocabulário, 语法 gramática)
   e cinco habilidades (听 ouvir, 说 falar, 读 ler, 写 escrever, 译 traduzir). Cada item carrega a dimensão/habilidade em `dim`. */
const ENGINE = (() => {
  const WORD = {}; DATA.words.forEach(w => { if (!WORD[w.z]) WORD[w.z] = w; });
  const UNITS = {}; DATA.levels.forEach(L => L.units.forEach(u => { UNITS[u.id] = u; }));
  const WRITE_UPTO = {}; let acc = new Set();
  for (let lv = 1; lv <= 7; lv++) { (DATA.writing[lv] || []).forEach(c => acc.add(c)); WRITE_UPTO[lv] = new Set(acc); }
  const DIMS = ["listen", "speak", "read", "write", "translate", "syllable", "grammar"];
  const UNLOCK = 0.6, L0 = 0.15;

  /* aleatório com semente (as opções de um item ficam estáveis enquanto ele está na tela) */
  function rng(seed) { let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const shuffle = (a, r = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const gloss = (w, lang) => (lang === "en" ? (w.en || w.pt) : (w.pt || w.en)) || "—";
  const glossIsFallback = (w, lang) => lang === "en" ? !w.en : !w.pt;

  /* variações de tom do pinyin para distratores do item de sílabas */
  const TONES = { a: "āáǎà", e: "ēéěè", i: "īíǐì", o: "ōóǒò", u: "ūúǔù", "ü": "ǖǘǚǜ" };
  const BASE = {}; for (const v in TONES) [...TONES[v]].forEach((t, k) => { BASE[t] = [v, k]; });
  function pinyinVariants(py, n, r = Math.random) {
    const out = new Set([py]), chars = [...py];
    const toned = chars.map((c, i) => BASE[c] ? i : -1).filter(i => i >= 0);
    const vowels = chars.map((c, i) => TONES[c] ? i : -1).filter(i => i >= 0);
    let guard = 0;
    while (out.size < n + 1 && guard++ < 60) {
      const cs = chars.slice();
      if (toned.length && r() < .85) {
        const i = toned[Math.floor(r() * toned.length)], [v, k] = BASE[cs[i]];
        let k2 = Math.floor(r() * 4); if (k2 === k) k2 = (k2 + 1 + Math.floor(r() * 3)) % 4;
        cs[i] = TONES[v][k2];
        if (toned.length > 1 && r() < .4) { const j = toned[Math.floor(r() * toned.length)]; if (j !== i) { const [v2, kk] = BASE[cs[j]]; cs[j] = TONES[v2][(kk + 1 + Math.floor(r() * 3)) % 4]; } }
      } else if (vowels.length) {
        const i = vowels[Math.floor(r() * vowels.length)]; cs[i] = TONES[cs[i]][Math.floor(r() * 4)];
      }
      out.add(cs.join(""));
    }
    out.delete(py);
    return [...out].slice(0, n);
  }

  /* distratores de vocabulário: mesma unidade primeiro, depois o mesmo nível; glosas diferentes da correta */
  function distractors(w, n, lang, r) {
    const pool = shuffle(DATA.words.filter(x => x.lv === w.lv && x.z !== w.z), r);
    const g = gloss(w, lang), seen = new Set([g]), out = [];
    for (const x of pool) { const gx = gloss(x, lang); if (!seen.has(gx) && x.z.length <= w.z.length + 2) { seen.add(gx); out.push(x); } if (out.length >= n) break; }
    return out;
  }
  function charDistractors(ch, lv, n, r) {
    const pool = shuffle([...WRITE_UPTO[Math.max(2, lv)]].filter(c => c !== ch), r);
    return pool.slice(0, n);
  }

  /* itens de uma unidade de vocabulário */
  function unitItems(uid, caps) {
    const u = UNITS[uid]; if (!u) return [];
    const items = [];
    u.w.forEach(z => {
      const w = WORD[z], base = { skill: uid, lv: u.lv, w: z };
      items.push({ ...base, id: `${uid}:${z}:r`, type: "read", dim: "read", d: 1, c: .25 });
      items.push({ ...base, id: `${uid}:${z}:p`, type: "pinyin", dim: "syllable", d: 2, c: .25 });
      items.push({ ...base, id: `${uid}:${z}:t`, type: "translate", dim: "translate", d: 2, c: .25 });
      if (caps.voice) items.push({ ...base, id: `${uid}:${z}:l`, type: "listen", dim: "listen", d: 2, c: .25 });
      if (caps.mic) items.push({ ...base, id: `${uid}:${z}:s`, type: "speak", dim: "speak", d: 2, c: .1 });
      /* escrita à mão: HSK 3.0 só exige a partir do nível 2, e apenas os caracteres do programa de escrita até o nível */
      if (u.lv >= 2) { const ch = [...z].find(c => WRITE_UPTO[u.lv].has(c)); if (ch) items.push({ ...base, id: `${uid}:${z}:w:${ch}`, type: "write", dim: "write", d: 3, c: caps.writer ? .1 : .25, ch }); }
    });
    return items;
  }
  function grammarItems(lv) {
    const skill = "g" + lv, out = [];
    DATA.gItems.filter(g => g.lv === lv).forEach(g => out.push({ id: `${skill}:${g.id}`, skill, lv, type: "gap", dim: "grammar", d: 2, c: .25, g }));
    DATA.gSent.filter(s => s.lv === lv).forEach(s => out.push({ id: `${skill}:${s.id}`, skill, lv, type: "order", dim: "grammar", d: 3, c: .05, s }));
    return out;
  }
  const COURSE_LV = n => n >= 9 ? 2 : 1;
  /* palavra de um item: do vocabulário oficial ou, no curso, uma entrada própria (músicas, ditados, caracteres das pautas) */
  const wordOf = it => it.wobj || WORD[it.w];
  const pseudo = (zh, py, pt, lv) => WORD[zh] ? { ...WORD[zh], pt: WORD[zh].pt || pt } : { z: zh, p: py, pt, en: "", c: [], lv };
  function courseItems(n) {
    const skill = "c" + String(n).padStart(2, "0"), C = DATA.course, lv = COURSE_LV(n), out = [], seen = new Set();
    C.gaps.forEach((g, i) => { if (g.a === n) out.push({ id: `${skill}:gap${i}`, skill, lv, type: "gap", dim: "grammar", d: 2, c: .25, g: { s: g.s, o: g.o, a: g.ans, ex: g.ex, full: g.full, py: g.py } }); });
    C.sent.forEach((s, i) => { if (s.a === n) out.push({ id: `${skill}:ord${i}`, skill, lv, type: "order", dim: "translate", d: 3, c: .05, s: { zh: s.zh, pt: s.pt, t: s.toks, py: s.py, alt: s.alt } }); });
    C.read.forEach((r, ri) => { if (r.a === n) r.q.forEach((q, qi) => out.push({ id: `${skill}:rd${ri}.${qi}`, skill, lv, type: "rq", dim: "read", d: 2, c: .25, q, r: ri })); });
    C.vocab.filter(v => v.a === n).forEach(v => { if (seen.has(v.zh)) return; seen.add(v.zh); const wobj = pseudo(v.zh, v.py, v.pt, lv); out.push({ id: `${skill}:${v.zh}:r`, skill, lv, type: "read", dim: "read", d: 1, c: .25, w: v.zh, wobj }); });
    ((C.write || {})[n] || []).forEach(({ ch, py }) => { const wobj = WORD[ch] || { z: ch, p: py, pt: (C.vocab.find(v => v.zh === ch) || {}).pt || "", en: "", c: [], lv }; out.push({ id: `${skill}:w:${ch}`, skill, lv, type: "write", dim: "write", d: 3, c: .1, w: ch, wobj, ch }); });
    return out;
  }
  function itemsFor(skill, caps) {
    if (skill[0] === "h") return unitItems(skill, caps);
    if (skill[0] === "g") return grammarItems(+skill.slice(1));
    return courseItems(+skill.slice(1));
  }

  /* opções de múltipla escolha, estáveis por item + tentativa */
  function options(it, lang, seed) {
    const r = rng(it.id + "|" + seed), w = wordOf(it);
    if (it.type === "read") { const ds = distractors(w, 3, lang, r); return shuffle([w, ...ds], r).map(x => ({ key: x.z, label: gloss(x, lang) })); }
    if (it.type === "translate" || it.type === "listen") { const ds = distractors(w, 3, lang, r); return shuffle([w, ...ds], r).map(x => ({ key: x.z, label: x.z, py: x.p })); }
    if (it.type === "pinyin") {
      const v = pinyinVariants(w.p, 3, r);
      for (const x of shuffle(DATA.words.filter(x => x.lv === w.lv && x.z.length === w.z.length), r)) { if (v.length >= 3) break; if (x.p !== w.p && !v.includes(x.p)) v.push(x.p); }
      return shuffle([w.p, ...v], r).map(p => ({ key: p, label: p }));
    }
    if (it.type === "write") { return shuffle([it.ch, ...charDistractors(it.ch, it.lv, 3, r)], r).map(c => ({ key: c, label: c })); }
    if (it.type === "gap") return shuffle(it.g.o, r).map(o => ({ key: o, label: o }));
    if (it.type === "rq") return shuffle(it.q.o, r).map(o => ({ key: o, label: o, py: it.q.py[o] }));
    return [];
  }
  function answerKey(it) {
    if (it.type === "pinyin") return wordOf(it).p;
    if (it.type === "write") return it.ch;
    if (it.type === "gap") return it.g.a;
    if (it.type === "rq") return it.q.ans;
    return it.w;
  }

  /* escolha adaptativa em dois passos: (1) o tipo de exercício, alternando as habilidades e aproximando a dificuldade do domínio atual;
     (2) o item desse tipo, evitando os recentes e preferindo palavras ainda não acertadas */
  function pick(items, mastery, recent, solved, r = Math.random) {
    if (!items.length) return null;
    const target = mastery < .35 ? 1.4 : mastery < .7 ? 2 : 2.8;
    const byType = {}; items.forEach(it => (byType[it.type] = byType[it.type] || []).push(it));
    const recentTypes = recent.map(id => (items.find(i => i.id === id) || {}).type).filter(Boolean);
    const tScore = ty => { const d = byType[ty][0].d, n = recentTypes.slice(-4).filter(x => x === ty).length; return Math.abs(d - target) * .6 + n * .9 + r() * 1.1; };
    const ty = Object.keys(byType).reduce((b, x) => (b == null || tScore(x) < b.s ? { x, s: tScore(x) } : b), null).x;
    const score = it => (recent.includes(it.id) ? 5 : 0) + (solved[it.id] ? 1.5 : 0) + r();
    return byType[ty].reduce((b, it) => (b == null || score(it) < b.s ? { it, s: score(it) } : b), null).it;
  }

  /* desbloqueio: unidade n precisa da n-1 com 60%; o nível L precisa de 60% das unidades do nível L-1 com 60% */
  function levelOpen(S, lv, M) {
    if (lv === 1 || S.free) return true;
    const prev = DATA.levels[lv - 2].units; const ok = prev.filter(u => M(u.id) >= UNLOCK).length;
    return ok / prev.length >= UNLOCK || !!S.keyed["L" + lv];
  }
  function unitOpen(S, uid, M) {
    const u = UNITS[uid]; if (S.free || S.keyed[uid]) return true;
    if (!levelOpen(S, u.lv, M)) return false;
    return u.n === 1 || M(`h${u.lv}u${String(u.n - 1).padStart(2, "0")}`) >= UNLOCK;
  }
  function skillOpen(S, skill, M) {
    if (skill[0] === "h") return unitOpen(S, skill, M);
    if (skill[0] === "g") return levelOpen(S, +skill.slice(1), M);
    return true;   /* aulas do curso: sempre abertas (o estudante segue o ritmo da turma) */
  }
  /* prior hierárquico (como no IAWise): 15% na primeira unidade do nível 1; depois, metade 15% e metade o domínio da unidade anterior */
  function prior(skill, M) {
    if (skill[0] === "h") {
      const u = UNITS[skill];
      if (u.n > 1) return .5 * L0 + .5 * M(`h${u.lv}u${String(u.n - 1).padStart(2, "0")}`);
      if (u.lv === 1) return L0;
      const prev = DATA.levels[u.lv - 2].units; return .5 * L0 + .5 * prev.reduce((a, x) => a + M(x.id), 0) / prev.length;
    }
    return L0;
  }

  /* pinyin para qualquer texto: segmenta pela palavra mais longa do vocabulário oficial e cai para o pinyin do caractere */
  const MAXW = Math.min(8, Math.max(...Object.keys(WORD).map(z => z.length)));
  function pyTokens(text) {
    const out = []; const s = String(text || ""); let i = 0, buf = "";
    const flush = () => { if (buf) { out.push({ t: buf, p: null }); buf = ""; } };
    while (i < s.length) {
      if (!/[\u4e00-\u9fff]/.test(s[i])) { buf += s[i++]; continue; }
      flush();
      let hit = null;
      for (let L = Math.min(MAXW, s.length - i); L > 1; L--) { const p = s.slice(i, i + L); if (WORD[p]) { hit = p; break; } }
      if (hit) { out.push({ t: hit, p: WORD[hit].p }); i += hit.length; }
      else { out.push({ t: s[i], p: (DATA.pyc || {})[s[i]] || "" }); i++; }
    }
    flush(); return out;
  }
  const toneless = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ü/g, "v").replace(/[^a-z]/gi, "").toLowerCase();
  const pinyinOf = text => pyTokens(text).filter(x => x.p).map(x => x.p).join(" ");

  return { pyTokens, toneless, pinyinOf, wordOf, WORD, UNITS, DIMS, UNLOCK, L0, WRITE_UPTO, gloss, glossIsFallback, pinyinVariants, itemsFor, unitItems, grammarItems, courseItems, options, answerKey, pick, levelOpen, unitOpen, skillOpen, prior, shuffle, rng, COURSE_LV };
})();
