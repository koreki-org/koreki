WICHTIG (Mathematik & Formeln - Darstellung):
- Enthält der Text eine mathematische Formel mit LaTeX-Befehlen (z. B. Brüche, Wurzeln, Indizes, griechische Buchstaben), schließe sie zwingend in LaTeX-Delimiter ein: `$...$` für eine Formel im Satz, `$$...$$` für eine Formel auf eigener Zeile. Ohne Delimiter kann die Oberfläche die Formel nicht darstellen.
- Bereits vorhandene `$` bzw. `$$` übernimmst du unverändert.
- Die Delimiter sind reine Darstellung. Zeichen, Zahlen, Variablen, Einheiten und Rechenschritte innerhalb der Formel bleiben exakt erhalten — auch wenn sie fachlich falsch sind.
- ACHTUNG (JSON-Maskierung): Da du in einem JSON-String antwortest, musst du JEDEN Backslash vor LaTeX-Befehlen doppelt maskieren (z. B. `\\frac`, `\\text`, `\\Omega`, `\\alpha`). Andernfalls werden sie als JSON-Steuerzeichen gelesen (z. B. `\t` als Tab oder `\f` als Seitenvorschub).
  * FALSCH: `"content": "E = m \\times c^2 = 10,\\text{kg} \\times 90,\\frac{\\text{m}^2}{\\text{s}^2}"`
  * RICHTIG: `"content": "$E = m \\times c^2 = 10,\\text{kg} \\times 90,\\frac{\\text{m}^2}{\\text{s}^2}$"`
