---
description: Structured Architectural & Strategic Governance Review for Koreki
---

# Workflow: Strategic Governance Review (Industrial Grade)

Dieser Workflow definiert den Prozess für die Evaluierung und Implementierung neuer System-Features oder signifikanter Architektur-Änderungen in Koreki.

## Phase 1: Strategic Alignment (Council Review)

1.  **Request Initiation**: Ein Feature (z.B. "Logto Migration") wird dokumentiert.
2.  **Product Manager Review**:
    -   Passt das Feature in die **Roadmap**?
    -   Welchen **User Value** bietet es?
3.  **Principal Architect Review**:
    -   Ist die technische Machbarkeit gegeben?
    -   Gefährdet es den **Stateless Core** oder das **Credit-Modell**?
    -   Delegation an Spezialisten (Security/UI).

## Phase 2: Technical Deep-Dive (Specialist Audit)

4.  **Compliance Audit (Security Officer)**:
    -   Prüfung auf **DSGVO-Integrität**.
    -   Validation des **PII-Cleaning** Konzepts.
5.  **Aesthetics & UX Audit (UI Expert)**:
    -   Entspricht das Design dem **Glassmorphism-Standard**?
    -   Nutzt es die bestehenden **Tailwind-Tokens**?

## Phase 3: Validation & Deployment (Final Guard)

6.  **Reliability Audit (QA Engineer)**:
    -   Definition der **Playwright Tests** für dieses Feature.
    -   Ausführung des `layer3-smoke` Tests.
7.  **Final Execution Path**:
    -   Erteilung des "Go" durch den **Principal Architect**.
    -   Merge in den `main` Branch und Deployment via **Coolify**.

---
*Governance Standard: INDUSTRIAL GRADE*
