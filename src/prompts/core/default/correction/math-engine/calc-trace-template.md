<engine_vorevaluierung type="calc_trace" task="{{TASK_NAME}}">
{{MATH_FALLBACK_INSTRUCTION}}

<engine_status>
- STATUS DER ENGINE: {{ENGINE_STATUS_TEXT}}
- ZU VERGEBENDE PUNKTE: {{POINTS_TEXT}}
</engine_status>

<teilpunkte_anweisung>
- WENN "Endziel erreicht: JA" UND keine Rechenfehler/Sandbox-Fehler vorliegen => Vergib ZWINGEND die VOLLE Punktzahl! Es sind keine weiteren Abzüge zulässig.
- WENN Rechenfehler/Sandbox-Fehler vorliegen => ACHTUNG: Die volle Punktzahl ist VERBOTEN, selbst wenn das Endziel erreicht wurde (Mentale Reparatur)! Wende zwingend die untenstehenden Abzugsregeln für fiktive Ergebnisse an.
- WENN "Endziel erreicht: NEIN" (ohne Sandbox-Fehler) => Vergib Teilpunkte aus dem Erwartungshorizont basierend auf den 'ERREICHTEN MEILENSTEINEN'.
</teilpunkte_anweisung>

{{HYBRID_INSTRUCTION_BLOCK}}
</engine_vorevaluierung>
