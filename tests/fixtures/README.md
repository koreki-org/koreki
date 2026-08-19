# Test-Fixtures

Testdaten mit erfundenen Namen — keine echten Schülerarbeiten.

| Datei | Verwendung |
|---|---|
| `musterloesung.pdf` | Nutzerreise (`tests/e2e/local/nutzerreise.spec.ts`) |
| `schuelerloesung.pdf` | Nutzerreise — **nicht löschen**, der Test lädt sie fest |
| `schuelerloesung-handschrift.jpg` | Handschrift-Referenz, Direktfoto (2304×3264 px, ~275 DPI) |
| `schuelerloesung-handschrift.pdf` | Dieselbe Handschrift als PDF (eingebetteter Scan 1669×2340 px, ~200 DPI, 2 Seiten) |

## Warum zweimal dieselbe Handschrift?

Die beiden Handschrift-Dateien zeigen denselben Inhalt in **unterschiedlicher Quellauflösung**
und sind deshalb keine Dublette. Sie dokumentieren einen gemessenen Befund (06.08.2026):

Dasselbe Blatt wird als JPG besser erkannt als als PDF — nicht wegen des Dateiformats,
sondern weil der in die PDF eingebettete Scan bereits auf ~200 DPI heruntergerechnet ist,
während das Direktfoto ~275 DPI trägt.

Gegengeprüft wurde auch die naheliegende Vermutung, unser eigenes Rendering sei schuld
(`renderSinglePage`, `scale: 2.5` = 180 DPI): Ein Vergleich mit 180 / 252 / 300 DPI durch
`mistral-ocr-4-1` lieferte **denselben Text mit denselben Fehlern**. Höher zu rendern als
die Quelle hergibt, bringt nichts — es vergrößert nur Rechenzeit und Upload.

Wer die Auflösung des Renderings anfassen will, sollte das vorher an diesen beiden Dateien
messen statt zu schätzen.
