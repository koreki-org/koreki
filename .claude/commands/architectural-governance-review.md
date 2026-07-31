---
description: Structured Architectural & Strategic Governance Review for Koreki
---

# Workflow: Strategic Governance Review (Industrial Grade)

Dieser Workflow definiert den Prozess für die Evaluierung und Implementierung neuer System-Features oder signifikanter Architektur-Änderungen in Koreki. Nutze bei Bedarf die Personas unter [.claude/agents/](../agents/) für die jeweilige Perspektive.

## Phase 1: Strategic Alignment (Council Review)

1.  **Request Initiation**: Ein Feature (z.B. "Logto Migration") wird dokumentiert.
2.  **Product Manager Review** (Persona: `product-manager`):
    -   Passt das Feature in die **Roadmap**?
    -   Welchen **User Value** bietet es?
3.  **Principal Architect Review** (Persona: `principal-architect`):
    -   Ist die technische Machbarkeit gegeben?
    -   Gefährdet es den **Stateless Core** oder das **Credit-Modell**?
    -   Delegation an Spezialisten (Security/UI).

## Phase 2: Technical Deep-Dive (Specialist Audit)

4.  **Compliance Audit** (Persona: `security-officer`):
    -   Prüfung auf **DSGVO-Integrität**.
    -   Validation des **PII-Cleaning** Konzepts.
5.  **Aesthetics & UX Audit** (Persona: `ui-expert`):
    -   Entspricht das Design dem **Glassmorphism-Standard**?
    -   Nutzt es die bestehenden **Tailwind-Tokens**?

## Phase 3: Validation & Deployment (Final Guard)

6.  **Reliability Audit** (Persona: `qa-engineer`):
    -   Definition der **Playwright Tests** für dieses Feature.
    -   Ausführung des `/layer3-smoke` Befehls.
7.  **Final Execution Path**:
    -   Erteilung des "Go" durch den **Principal Architect**.
    -   Merge in den `main` Branch und Deployment via **Coolify**.

---
*Governance Standard: INDUSTRIAL GRADE*
