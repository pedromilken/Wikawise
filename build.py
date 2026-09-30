#!/usr/bin/env python3
"""Gera index.html (arquivo único, pronto para o GitHub Pages) a partir de src/."""
import pathlib
root = pathlib.Path(__file__).parent
src = root / "src"
order = ["data.js", "i18n.js", "models.js", "game.js", "engine.js", "llm.js", "app.js"]
js = "\n".join((src / f).read_text(encoding="utf-8") for f in order)
css = (src / "style.css").read_text(encoding="utf-8")
html = f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Wikawise · HSK 3.0</title>
<meta name="description" content="Treino adaptativo para o HSK 3.0 com vocabulário, caracteres e gramática do programa oficial, cinco habilidades (听说读写译) e knowledge tracing. Derivado do DevWise.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>汉</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Noto+Serif+SC:wght@400;600&display=swap" rel="stylesheet">
<style>
{css}
</style>
</head>
<body>
<div class="wrap" id="app"></div>
<script>
{js}
</script>
</body>
</html>
"""
(root / "index.html").write_text(html, encoding="utf-8")
print("index.html gerado:", len(html.encode()) // 1024, "KB")
