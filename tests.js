/* Testes sem navegador: node tests.js */
const fs = require("fs"), vm = require("vm");
const ctx = { console, Math, Date, JSON };
vm.createContext(ctx);
for (const f of ["data.js", "models.js", "game.js", "engine.js"]) vm.runInContext(fs.readFileSync(__dirname + "/src/" + f, "utf8").replace(/^const (\w+) =/gm, "var $1 ="), ctx);
const { DATA, ENGINE: E, KT, GAME } = ctx;
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FALHOU:", m); } };
/* contagens do programa oficial */
const cnt = lv => DATA.words.filter(w => w.lv === lv).length;
ok(Math.abs(cnt(1) - 300) <= 3, "HSK 1 tem ~300 palavras: " + cnt(1));
ok(Math.abs(cnt(2) - 200) <= 3, "HSK 2 tem ~200 palavras: " + cnt(2));
ok(Math.abs(cnt(3) - 500) <= 3, "HSK 3 tem ~500 palavras: " + cnt(3));
ok((DATA.writing[2] || []).length === 100, "100 caracteres de escrita no nível 2");
ok(!DATA.writing[1], "nível 1 não exige escrita à mão");
ok(DATA.levels.length === 7 && cnt(7) > 5500, "faixa 7–9 presente: " + cnt(7));
ok((DATA.writing[7] || []).length === 500, "500 caracteres de escrita na faixa 7–9");
ok(DATA.words.filter(w => w.lv <= 2).every(w => w.pt), "todas as palavras dos níveis 1 e 2 têm glosa em português");
ok(DATA.words.every(w => w.p && /[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹ]/i.test(w.p)), "toda palavra tem pinyin");
/* unidades */
const ids = DATA.levels.flatMap(L => L.units.map(u => u.id));
ok(new Set(ids).size === ids.length, "ids de unidade únicos");
ok(DATA.levels.every(L => L.units.every(u => u.w.every(z => E.WORD[z]))), "toda palavra de unidade existe");
/* itens */
const caps = { voice: true, mic: true, writer: true };
const all = [...ids.map(id => E.itemsFor(id, caps)), [1, 2, 3, 4, 5, 6, 7].map(l => E.itemsFor("g" + l, caps)), Array.from({ length: 14 }, (_, i) => E.itemsFor("c" + String(i + 1).padStart(2, "0"), caps))].flat(2);
ok(new Set(all.map(i => i.id)).size === all.length, "ids de item únicos (" + all.length + ")");
ok(all.every(i => i.d >= 1 && i.d <= 3 && i.c > 0 && i.c < 1 && i.dim && i.lv), "itens têm d, c, dim e lv");
ok(!all.some(i => i.type === "write" && i.lv < 2 && i.skill[0] === "h"), "sem escrita à mão no vocabulário do nível 1");
ok(all.filter(i => i.skill[0] === "c" && i.type === "write").every(i => i.wobj && i.wobj.p), "escrita das pautas com pinyin");
for (const it of all.filter(i => !["order", "speak"].includes(i.type))) {
  const o = E.options(it, "pt", 1), k = E.answerKey(it);
  if (!o.some(x => x.key === k)) { ok(false, "resposta fora das opções: " + it.id); break; }
  if (new Set(o.map(x => x.key)).size !== o.length) { ok(false, "opções repetidas: " + it.id); break; }
  if (it.type !== "gap" && it.type !== "rq" && o.length < 4) { ok(false, "menos de 4 opções: " + it.id); break; }
}
ok(E.pinyinVariants("māma", 3).every(p => p !== "māma"), "variantes de tom diferentes do original");
ok(E.pinyinVariants("xiǎng", 3).length === 3, "3 variantes de tom");
/* rastreamento e desbloqueio */
const S = { skills: {}, keyed: {}, free: false };
const M = s => S.skills[s] ? KT.mastery(S.skills[s], "elo") : 0;
ok(E.unitOpen(S, "h1u01", M) && !E.unitOpen(S, "h1u02", M), "só a primeira unidade abre no início");
ok(!E.levelOpen(S, 2, M), "nível 2 fechado no início");
const tr = KT.ensure({ L: .15 }); const it = all.find(i => i.skill === "h1u01");
for (let i = 0; i < 12; i++) KT.updateAll(tr, it, it.c, 1);
ok(KT.mastery(tr, "elo") > .6, "12 acertos passam de 60% (" + KT.mastery(tr, "elo").toFixed(2) + ")");
S.skills.h1u01 = tr; ok(E.unitOpen(S, "h1u02", M), "unidade 2 abre depois da 1");
ok(E.prior("h1u02", M) > .15, "prior hierárquico usa a unidade anterior");
ok(GAME.gain({ mode: "normal", boost: 0, lastWrong: false, inv: { shield: 0 } }, 2, true) === 20, "XP de acerto d=2");
console.log(fail ? fail + " teste(s) falharam" : "todos os testes passaram", "·", all.length, "itens");
process.exit(fail ? 1 : 0);
