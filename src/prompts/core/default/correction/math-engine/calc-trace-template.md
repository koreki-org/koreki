<engine_vorevaluierung type="calc_trace" task="{{TASK_NAME}}">
{{MATH_FALLBACK_INSTRUCTION}}

<engine_status>
- STATUS DER ENGINE: {{ENGINE_STATUS_TEXT}}
- ZU VERGEBENDE PUNKTE: {{POINTS_TEXT}}
</engine_status>

<teilpunkte_anweisung>
- WENN "Endziel erreicht: JA" => Vergib ZWINGEND die VOLLE Punktzahl! Es sind keine weiteren Abzüge zulässig.
- WENN "Endziel erreicht: NEIN" => Vergib Teilpunkte aus dem Erwartungshorizont basierend auf den 'ERREICHTEN MEILENSTEINEN', selbst wenn das Endziel nicht komplett erreicht wurde!
</teilpunkte_anweisung>

{{HYBRID_INSTRUCTION_BLOCK}}
</engine_vorevaluierung>
