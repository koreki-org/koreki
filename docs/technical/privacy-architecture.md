# Privacy Architecture: Pure Mode Strategy
🏮🛡️🏛️

## Core Principle: Zero-Transit PII

Koreki follows a strict "Industrial Grade" privacy standard. For the **SaaS Pure Mode**, we have intentionally decided **AGAINST** a server-side proxy for user-provided API keys.

### Why No Proxy?

1. **DSGVO / GDPR Integrity**: A server-side proxy, even a transient one that doesn't store keys, would still process student-related PII (Personally Identifiable Information) on our infrastructure. To be truly compliant with the highest privacy standards, we ensure that in "Pure Mode", data **never** touches Koreki's SaaS servers.
2. **Client-Side Sovereignty**: By connecting the browser directly to the AI provider (e.g., Mistral, OpenAI, Mittwald), the data flow is limited to the user's device and the chosen AI engine.

### Technical Implications

*   **CORS Requirements**: Since requests are made directly from the browser (`koreki.org`), the AI provider must support **CORS (Cross-Origin Resource Sharing)** for our domain.
*   **Provider Limitations**: Some providers might block direct browser access for security reasons. In such cases, users are encouraged to use the **Koreki Desktop App**, which bypasses browser CORS limitations natively while maintaining the same privacy standards.
*   **Desktop Native Vault Security**: On Desktop, keys are not only processed client-side but also stored in the **OS-native Hardware Vault** (Windows Credential Manager, Keychain, Secret Service). This prevents extraction from the filesystem and provides a higher security level than browser RAM-only storage.
*   **Infrastructure recommendation**: For organizations requiring enterprise-grade performance without SaaS transit, we recommend the **Community Edition (Self-Hosted)**.

---

## Pillar 6: Automated Data Retention (Zero-Ops)

To maintain maximum data minimization and long-term system performance, Koreki implements a fully automated data retention strategy.

### 1. Scope & Retention Period
*   **Standard Period**: **90 Days**.
*   **Affected Data**: Technical audit logs (`PrivacyLog`), compliance confirmations, recorded source IP addresses, and transient session identifiers (`ProcessedStripeSession`).
*   **Excluded Data**: Core account data (User profiles) and persistent prompt profiles remain until manually deleted by the user.

### 2. Execution Mechanism
The cleanup process is handled natively by the Koreki server via the `instrumentation` hook:
*   **Startup Validation**: The cleanup script executes immediately upon container startup/deployment to ensure the policy is active.
*   **Daily Maintenance**: A recurring cron job triggers the cleanup every day at **03:00 AM** (Server Time).

### 3. Verification & Auditing
The execution of the retention policy is transparently recorded in the system logs:
*   **Success Signal**: A successful run is marked with the unique header `[PILLAR 6] SUCCESS: Automated Data Retention finished.`
*   **Transparency**: The logs include the exact timestamp and the number of records removed per table.
*   **Reliability**: Any failure in the cleanup process is logged as a `FATAL ERROR`, alerting administrators to potential infrastructure issues.

---
*Status: Standard*
