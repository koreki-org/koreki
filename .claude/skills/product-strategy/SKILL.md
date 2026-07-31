---
name: product-strategy
description: Strategische Roadmap, Nutzwert-Bündelung und Wachstums-Leitplanken für Koreki
---

# Skill: Product Strategy & Roadmap Governance

Dieser Skill definiert die strategischen Leitplanken für die Priorisierung von Funktionen und die Maximierung des Nutzerwerts für Lehrkräfte. Er ist das operative Werkzeug für den **Product Manager**.

## 1. Roadmap-Souveränität & Priorisierung
Jede neue Funktion muss gegen die **Core-Mission** geprüft werden: "80% Zeitersparnis bei der Korrektur".
- **P1 (Golden Thread)**: Maximale Stabilität des Pfads "Upload -> OCR -> KI -> Excel".
- **P2 (Datenschutz-Exzellenz)**: Ausbau der PURE-Funktionalität (BYOK) vor Cloud-Speichern.
- **P3 (Open Source Readiness)**: Modularität wahren, um zukünftige Skalierbarkeit zu ermöglichen.

## 2. Credit- & Billing-Governance (Pillar 7 & 8 Logic)
Finanzielle Integrität ist Teil des Produkts:
- **Pillar 7 (Cost Brake)**: Systemweite Kostenkontrolle via `SystemSettings` (Budget-Gate).
- **Industrial Gating**: Neue Korrektur-Sitzungen müssen bei Budget-Limit blockiert werden (Status 401/403).
- **Grant-Policy**: Neuregistrierungen erhalten automatisch **20 Start-Credits**.

## 3. Pedagogical Excellence
- **Expert Sovereignty**: Lehrkräfte MÜSSEN ihre Prompts personalisieren können (Custom Profiles).
- **Transparency-First**: Jede KI-Entscheidung muss via "Review-Modus" (Side-by-Side) für den Lehrer verifizierbar und überschreibbar sein.

## 4. User Feedback Loop & Drift Detection
- Überwache die Konsistenz zwischen technischen Features und der Nutzererwartung (KPI: Zeitersparnis).
- Bei technischer Komplexität, die den Workflow verlangsamt, ist eine Refaktorierung (Bündelung von Prompts) einzuleiten.

---
*Status: Approved (V6)*
