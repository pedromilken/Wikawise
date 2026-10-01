#!/usr/bin/env python3
"""Gera src/data.js a partir de tools/fontes/.

Fontes:
  syllabus_words.json      vocabulário do Programa do Exame HSK (CLEC, nov. 2025): nº, nível, palavra, pinyin, classe gramatical
                           (extraído do PDF 新版HSK考试大纲（词汇、汉字、语法）, redistribuído em github.com/leonsilicon/hsk3.1)
  HSK3.1_words_levelN.json lista oficial por nível (conferência de contagem)
  HSK3.1_chars_levelN.json caracteres de leitura (认读字) por nível
  escrita.json             caracteres de escrita à mão (书写字) por nível, extraídos do mesmo PDF
  gramatica_oficial.json   Programa de gramática (语法大纲) por nível, texto do PDF
  en_glosas.json           glosas em inglês (CC-CEDICT via drkameleon/complete-hsk-vocabulary, MIT)
  pt_l12.txt               glosas em português dos níveis 1 e 2 (autorais)
  pt_glosas.json           (opcional) glosas em português geradas por tools/gerar-glosas.js para os níveis 3 a 6
  curso_m2.json            conteúdo do Módulo 2 do curso Mandarim Básico (HSK 2): resumo autoral das aulas
Uso: python3 tools/build_data.py && python3 build.py
"""
import json, re, pathlib
from pypinyin import pinyin, Style

F = pathlib.Path(__file__).parent / "fontes"
OUT = pathlib.Path(__file__).parent.parent / "src" / "data.js"
UNIT = 50  # palavras por unidade

def flat(x):
    return [y for i in x for y in (i if isinstance(i, list) else [i])]

rows = json.load(open(F / "syllabus_words.json", encoding="utf-8"))
EN = json.load(open(F / "en_glosas.json", encoding="utf-8"))
PT = {}
for l in open(F / "pt_l12.txt", encoding="utf-8"):
    if "=" in l:
        k, v = l.rstrip("\n").split("=", 1)
        PT[k] = v
ptg = F / "pt_glosas.json"
if ptg.exists():
    for k, v in json.load(open(ptg, encoding="utf-8")).items():
        PT.setdefault(k, v)

POS = {"名": "n", "动": "v", "形": "adj", "副": "adv", "代": "pron", "数": "num", "量": "cl", "介": "prep", "连": "conj",
       "助": "part", "叹": "interj", "拟声": "onom", "前缀": "pref", "后缀": "suf", "数量": "numcl"}

def pos_code(p):
    out = []
    for part in re.split(r"[、，,]", p):
        part = part.strip("（）() ")
        if part in POS:
            out.append(POS[part])
    return out

def py_fallback(w):
    return "".join(s[0] for s in pinyin(w, style=Style.TONE))

levels = []
words = []
seen = set()
for lv in range(1, 8):  # 7 = faixa avançada 7–9 (高等), que tem uma lista única no programa
    official = flat(json.load(open(F / f"HSK3.1_words_level{lv}.json", encoding="utf-8")))
    bylv = {}
    for r in rows:
        if r["lv"] == ("7-9" if lv == 7 else str(lv)) and r["w"] not in bylv:
            bylv[r["w"]] = r
    lvwords = []
    for w in official:
        key = (lv, w)
        if key in seen:
            continue
        seen.add(key)
        r = bylv.get(w)
        py = r["py"] if r else py_fallback(w)
        ps = pos_code(r["pos"]) if r else []
        lvwords.append({"z": w, "p": py, "c": ps, "pt": PT.get(w, ""), "en": EN.get(w, "")})
    chars = flat(json.load(open(F / f"HSK3.1_chars_level{lv}.json", encoding="utf-8")))
    units = []
    for i in range(0, len(lvwords), UNIT):
        units.append({"id": f"h{lv}u{i // UNIT + 1:02d}", "lv": lv, "n": i // UNIT + 1, "w": [x["z"] for x in lvwords[i:i + UNIT]]})
    words += [dict(x, lv=lv) for x in lvwords]
    levels.append({"lv": lv, "units": units, "chars": chars, "nwords": len(lvwords)})

ESC = json.load(open(F / "escrita.json", encoding="utf-8"))
GRAM = json.load(open(F / "gramatica_oficial.json", encoding="utf-8"))
CURSO = json.load(open(F / "curso_m2.json", encoding="utf-8"))

# Pontos de gramática oficiais dos níveis 1 e 2 com explicação em português e exemplo (autoral).
# lv, título, explicação, exemplo zh, tradução, aula do curso que cobre (0 = só aqui)
GP = [
 (1, "是 (frase com 是)", "Liga sujeito e identidade/categoria.", "我是学生。", "Eu sou estudante.", 0),
 (1, "有 (posse) e 没有", "Ter; a negação é sempre 没有.", "我没有哥哥。", "Não tenho irmão mais velho.", 1),
 (1, "Lugar + 有 + coisa", "Existe algo em um lugar (存现句).", "桌子上有一本书。", "Tem um livro em cima da mesa.", 10),
 (1, "Perguntas com 吗, 呢 e A-não-A", "吗 para sim/não; 呢 retoma a pergunta; 好不好 também pergunta.", "你喜欢吗？你呢？", "Você gosta? E você?", 1),
 (1, "Pronomes interrogativos", "谁, 什么, 哪儿, 几, 多少, 怎么, 怎么样 substituem a informação pedida.", "你住在哪儿？", "Onde você mora?", 1),
 (1, "会, 能, 想, 要, 可以", "Verbos modais: habilidade, capacidade, desejo, intenção, permissão.", "我会说汉语。", "Sei falar chinês.", 1),
 (1, "Advérbios de grau", "很, 非常, 太…了, 真, 有(一)点儿.", "今天有点儿冷。", "Hoje está um pouco frio.", 1),
 (1, "都, 也, 还, 再", "Todos / também / ainda / de novo; ficam antes do verbo.", "我们都是学生。", "Somos todos estudantes.", 1),
 (1, "不 e 没(有)", "不 nega presente e hábito; 没 nega o passado.", "我昨天没去。", "Ontem não fui.", 9),
 (1, "在 + lugar / 在 + verbo", "Estar em; ação em andamento (在/正在…呢).", "他在学校学习。", "Ele estuda na escola.", 2),
 (1, "和 e 对 (preposições)", "和 = com; 对 = em relação a.", "我和朋友去饭店。", "Vou ao restaurante com um amigo.", 2),
 (1, "Classificadores", "个, 本, 口, 块, 件, 只, 杯 entre número e substantivo; 两 antes de classificador.", "我有两本书。", "Tenho dois livros.", 5),
 (1, "Datas e horas", "Ano → mês → dia → semana; 点/分, 半.", "今天是五月一号。", "Hoje é 1º de maio.", 7),
 (1, "了 de conclusão e de mudança", "Verbo + 了 = concluído; frase + 了 = mudou.", "我买了一个手机。", "Comprei um celular.", 9),
 (1, "Verbos consecutivos (连动句)", "Um verbo indica o modo ou o objetivo do outro.", "我坐地铁去公司。", "Vou de metrô para a empresa.", 3),
 (1, "Dois objetos (双宾语)", "Verbo + pessoa + coisa.", "老师给我一本书。", "O professor me deu um livro.", 0),
 (1, "Ordinal com 第", "第 + número.", "这是我第一次来中国。", "É minha primeira vez na China.", 0),
 (2, "Verbo + 过", "Experiência: já fez alguma vez.", "我去过北京。", "Já fui a Pequim.", 13),
 (2, "Verbo + 着", "Estado ou ação que continua.", "门开着。", "A porta está aberta.", 13),
 (2, "Comparação com 比 e 没有", "A 比 B + adj.; A 没有 B + adj.", "他比我高。", "Ele é mais alto que eu.", 13),
 (2, "Complemento de grau com 得", "Verbo + 得 + adjetivo.", "她跑得很快。", "Ela corre rápido.", 13),
 (2, "Complemento de resultado", "Verbo + 完/懂/好/错/会.", "我听懂了。", "Entendi (ouvindo).", 13),
 (2, "Complemento de direção", "Verbo + 来/去; 上/下/进/出/回/过 + 来/去.", "他走进来了。", "Ele entrou (vindo para cá).", 2),
 (2, "还是 em perguntas e 还是…吧", "Ou (escolha); é melhor…", "你喝茶还是喝咖啡？", "Você bebe chá ou café?", 13),
 (2, "要/快要/就要…了", "Algo está para acontecer.", "快要下雨了。", "Vai chover logo.", 13),
 (2, "已经…了, 正, 常/经常", "Já; exatamente agora; frequentemente.", "我已经吃饭了。", "Já comi.", 13),
 (2, "别 (imperativo negativo)", "Não faça!", "别说话！", "Não fale!", 9),
 (2, "因为…所以…, 虽然…但是…", "Causa e consequência; concessão.", "虽然很累，但是我很高兴。", "Embora cansado, estou feliz.", 8),
 (2, "一…就…", "Assim que… logo…", "我一到家就睡觉了。", "Assim que cheguei em casa, dormi.", 0),
 (2, "是…的", "Enfatiza quando, onde, como ou quem, no passado.", "你是怎么来的？", "Como foi que você veio?", 12),
 (2, "请/叫/让 + pessoa + verbo (兼语句)", "Convidar, mandar ou deixar alguém fazer.", "妈妈让我回家。", "Mamãe me mandou voltar para casa.", 12),
 (2, "从, 往, 给, 跟", "Desde/de; em direção a; para; com.", "从这儿往前走。", "Daqui, siga em frente.", 11),
 (2, "Reduplicação de verbos e adjetivos", "AA, A一A, ABAB: fazer um pouco; AABB: intensifica.", "你看看。", "Dê uma olhada.", 5),
 (2, "次 e números aproximados", "Verbo + número + 次; 几, 多 para quantidade aproximada.", "我去过两次。", "Fui duas vezes.", 13),
]

# Itens de lacuna adicionais para a gramática oficial dos níveis 1 e 2 (lv, frase, opções, resposta, explicação)
GX = [
 (1, "我___学生。", ["是", "有", "在", "叫"], "是", "Identidade: 是."),
 (1, "我___有哥哥。", ["没", "不", "别", "也"], "没", "A negação de 有 é sempre 没有."),
 (1, "你喜欢喝茶___？", ["吗", "呢", "吧", "了"], "吗", "Pergunta de sim ou não: 吗."),
 (1, "我很好，你___？", ["呢", "吗", "吧", "的"], "呢", "Devolver a pergunta: …呢？"),
 (1, "今天___冷。(um pouco)", ["有点儿", "一点儿", "一下", "非常多"], "有点儿", "有点儿 + adjetivo (tom negativo)."),
 (1, "我们___是学生。(todos)", ["都", "也", "还", "再"], "都", "都 = todos, antes do verbo."),
 (1, "我有两___书。", ["本", "个", "张", "件"], "本", "Livro: classificador 本."),
 (1, "这是我___一次来中国。", ["第", "个", "次", "是"], "第", "Ordinal: 第 + número."),
 (1, "老师给___一本书。", ["我", "在", "和", "对"], "我", "Dois objetos: 给 + pessoa + coisa."),
 (1, "他___学校学习。", ["在", "是", "有", "去"], "在", "在 + lugar + verbo."),
 (1, "明天见，我们___见！(de novo)", ["再", "还", "也", "都"], "再", "再 = de novo (futuro)."),
 (1, "他对我很___。", ["好", "是", "在", "有"], "好", "对 + pessoa + adjetivo."),
 (2, "我去___北京。(já fui)", ["过", "了", "着", "得"], "过", "Experiência: verbo + 过."),
 (2, "门开___。", ["着", "过", "了", "得"], "着", "Estado que continua: 着."),
 (2, "他___我高。", ["比", "跟", "对", "从"], "比", "Comparação: A 比 B + adjetivo."),
 (2, "我___有你高。", ["没", "不", "别", "比"], "没", "A 没有 B + adjetivo."),
 (2, "她跑___很快。", ["得", "的", "地", "了"], "得", "Grau: verbo + 得 + adjetivo."),
 (2, "我听___了。(entendi)", ["懂", "见", "到", "完"], "懂", "Resultado de entender: 懂."),
 (2, "你喝茶___喝咖啡？", ["还是", "或者", "也", "和"], "还是", "Escolha em pergunta: 还是."),
 (2, "___下雨了。(logo)", ["快要", "已经", "正在", "经常"], "快要", "快要…了 = estar para acontecer."),
 (2, "我___吃饭了。(já)", ["已经", "快要", "正", "别"], "已经", "已经…了 = já."),
 (2, "___说话！(não fale)", ["别", "没", "不是", "还"], "别", "Imperativo negativo: 别."),
 (2, "___很累，但是我很高兴。", ["虽然", "因为", "所以", "还是"], "虽然", "虽然…但是… = embora…"),
 (2, "我一到家___睡觉了。", ["就", "才", "也", "都"], "就", "一…就… = assim que…"),
 (2, "妈妈___我回家。(mandou)", ["让", "给", "对", "跟"], "让", "让 + pessoa + verbo."),
 (2, "___这儿往前走。", ["从", "在", "给", "对"], "从", "从 = a partir de."),
 (2, "他走进___了。(para cá)", ["来", "去", "上", "下"], "来", "Direção em relação a quem fala: 来 = para cá."),
 (2, "你看___。(dê uma olhada)", ["看", "了", "过", "着"], "看", "Reduplicação AA: fazer um pouco."),
]

# Frases para montar (gramática oficial)
GS = [
 (1, "我坐地铁去公司。", "Vou de metrô para a empresa."),
 (1, "桌子上有一本书。", "Tem um livro em cima da mesa."),
 (1, "老师给我一本书。", "O professor me deu um livro."),
 (1, "今天有点儿冷。", "Hoje está um pouco frio."),
 (2, "他比我高。", "Ele é mais alto que eu."),
 (2, "她跑得很快。", "Ela corre rápido."),
 (2, "我去过北京。", "Já fui a Pequim."),
 (2, "我一到家就睡觉了。", "Assim que cheguei em casa, dormi."),
 (2, "妈妈让我回家。", "Mamãe me mandou voltar para casa."),
]

import jieba
jieba.setLogLevel(60)
for w in ["T恤", "玩儿", "一会儿", "运动鞋", "雨果", "马丽", "卡米"]:
    jieba.add_word(w)
SPLIT = {"坐地铁": ["坐", "地铁"], "今天天气": ["今天", "天气"], "太贵": ["太", "贵"], "不太远": ["不太", "远"],
         "下个星期": ["下个", "星期"], "去过": ["去", "过"], "有点儿冷": ["有点儿", "冷"], "跑得": ["跑", "得"]}
PUN = set("，。？！、：")
def toks(zh):
    out = []
    for t in jieba.cut(zh):
        if not t.strip() or t in PUN:
            continue
        out += SPLIT.get(t, [t])
    return out
PY_WORD = {r["w"]: r["py"] for r in rows}
PARTICLE = {"了": "le", "得": "de", "着": "zhe", "的": "de", "吗": "ma", "呢": "ne", "吧": "ba", "过": "guo"}
def py_text(zh):
    parts = []
    for t in jieba.cut(zh):
        if t in PUN:
            if parts: parts[-1] += {"，": ",", "。": ".", "？": "?", "！": "!", "、": ",", "：": ":"}[t]
            continue
        if re.search(r"[\u4e00-\u9fff]", t):
            if t in PARTICLE: parts.append(PARTICLE[t]); continue
            if t in PY_WORD and len(t) > 1: parts.append(PY_WORD[t]); continue
            sy = [s[0] for s in pinyin(t, style=Style.TONE)]
            parts.append(" ".join(PARTICLE.get(c, s) if i > 0 else s for i, (c, s) in enumerate(zip(t, sy))) if len(t) > 1 else (PY_WORD.get(t) or sy[0]))
        else:
            parts.append(t)
    return " ".join(parts)

# material complementar do curso (partes escritas, exercícios, revisões, pautas, músicas e ditados)
EXT = F / "curso_m2_extras.json"
if EXT.exists():
    X = json.load(open(EXT, encoding="utf-8"))
    CURSO["lessons"] += [l for l in X.get("lessons", []) if l["n"] not in {x["n"] for x in CURSO["lessons"]}]
    for n, rules in X.get("theory", {}).items():
        CURSO["theory"].setdefault(n, [])
        CURSO["theory"][n] += [{"s": s, "u": u, "zh": zh, "py": py_text(zh), "pt": pt} for s, u, zh, pt in rules]
    for n, note in X.get("notes", {}).items():
        CURSO["notes"].setdefault(n, note)
    for a, s, o, ans, ex in X.get("gaps", []):
        full = s.split("(")[0].replace("___", ans).strip()
        CURSO["gaps"].append({"a": a, "s": s, "o": o, "ans": ans, "ex": ex, "full": full, "py": py_text(full)})
    for a, zh, pt in X.get("sent", []):
        CURSO["sent"].append({"a": a, "zh": zh, "pt": pt, "toks": toks(zh), "end": zh[-1] if zh[-1] in PUN else "", "py": py_text(zh), "alt": None})
    have = {(v["a"], v["zh"]) for v in CURSO["vocab"]}
    for a, zh, py, pt in X.get("vocab", []):
        if (a, zh) not in have: CURSO["vocab"].append({"a": a, "zh": zh, "py": py, "pt": pt})
    CURSO["write"] = {n: [{"ch": c, "py": PY_WORD.get(c) or pinyin(c, style=Style.TONE)[0][0]} for c in s if "\u4e00" <= c <= "\u9fff"] for n, s in X.get("write", {}).items()}

GRAM_L = {lv: [] for lv in range(1, 8)}
for lv, t, e, zh, pt, aula in GP:
    GRAM_L[lv].append({"t": t, "e": e, "zh": zh, "py": py_text(zh), "pt": pt, "aula": aula})
GITEMS = []
for i, (lv, s, o, a, ex) in enumerate(GX):
    full = s.split("(")[0].replace("___", a).strip()
    GITEMS.append({"id": f"g{lv}x{i:02d}", "lv": lv, "s": s, "o": o, "a": a, "ex": ex, "full": full, "py": py_text(full)})
# lacunas do curso também entram na gramática do nível correspondente
L2ANS = {"过", "比", "得", "着", "还是", "最", "已经", "次", "离", "帮", "快要", "虽然", "别", "让", "从"}
for i, g in enumerate(CURSO["gaps"]):
    lv = 2 if (g["a"] == 13 or g["ans"] in L2ANS or "是…的" in g["ex"] or "不是…的" in g["ex"]) else 1
    GITEMS.append({"id": f"gc{i:02d}", "lv": lv, "s": g["s"], "o": g["o"], "a": g["ans"], "ex": g["ex"], "full": g["full"], "py": g["py"], "aula": g["a"]})
GSENT = []
for i, (lv, zh, pt) in enumerate(GS):
    GSENT.append({"id": f"s{lv}x{i:02d}", "lv": lv, "zh": zh, "pt": pt, "t": toks(zh), "py": py_text(zh)})

# gramática gerada para os níveis 3 a 6 (tools/juntar-gramatica.js grava fontes/gramatica_pt.json)
GPT = F / "gramatica_pt.json"
if GPT.exists():
    for lvs, blk in json.load(open(GPT, encoding="utf-8")).items():
        lv = int(lvs)
        for p in blk.get("pontos", []):
            GRAM_L[lv].append({"t": p["t"], "e": p["e"], "zh": p["zh"], "py": py_text(p["zh"]), "pt": p["pt"], "aula": 0})
        for i, g in enumerate(blk.get("itens", [])):
            full = g["s"].split("(")[0].replace("___", g["a"]).strip()
            GITEMS.append({"id": f"g{lv}n{i:03d}", "lv": lv, "s": g["s"], "o": g["o"], "a": g["a"], "ex": g["ex"], "full": full, "py": py_text(full)})
        for i, f in enumerate(blk.get("frases", [])):
            GSENT.append({"id": f"s{lv}n{i:03d}", "lv": lv, "zh": f["zh"], "pt": f["pt"], "t": toks(f["zh"]), "py": py_text(f["zh"])})

DATA = {
    "levels": levels,
    "words": words,
    "writing": ESC,
    "grammarOfficial": GRAM,
    "grammarPT": GRAM_L,
    "gItems": GITEMS,
    "gSent": GSENT,
    "course": CURSO,
    "standards": {  # Programa do exame HSK (CLEC, nov. 2025): palavras novas e acumuladas, pontos de gramática (níveis 1 a 3)
        "1": {"words": 300, "cum": 300, "gram": 70}, "2": {"words": 200, "cum": 500, "gram": 78},
        "3": {"words": 500, "cum": 1000, "gram": 96}, "4": {"words": 1000, "cum": 2000},
        "5": {"words": 1600, "cum": 3600}, "6": {"words": 1800, "cum": 5400},
        "7": {"words": 5636, "cum": 11092},
    },
}
js = "/* Gerado por tools/build_data.py. Não edite à mão. */\nconst DATA = " + json.dumps(DATA, ensure_ascii=False, separators=(",", ":")) + ";\n"
OUT.write_text(js, encoding="utf-8")
print("src/data.js:", len(js) // 1024, "KB;", len(words), "palavras;", sum(len(l["units"]) for l in levels), "unidades;",
      len(GITEMS), "itens de gramática;", sum(1 for w in words if w["pt"]), "glosas em português")
