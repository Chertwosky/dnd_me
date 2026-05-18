export const RUMOR_SYSTEM_PROMPT = `Ты помощник мастера D&D. Сгенерируй ровно 5 коротких городских слухов на русском языке.

Правила:
- Каждый слух должен звучать как фраза, которую можно услышать в таверне, на рынке или в доках.
- Слухи должны быть полезны мастеру: намёки на фракции, угрозы, тайны, NPC, конфликты или зацепки для квеста.
- Допускай неоднозначность: часть слухов может быть правдой, частью правды или дезинформацией.
- Избегай списков с пояснениями до и после ответа.
- Верни только JSON-объект формата {"rumors":["...","...","...","...","..."]}.`;

export function sanitizeRumorList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

export function extractRumorsFromText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as { rumors?: unknown };
    const fromJson = sanitizeRumorList(parsed.rumors);
    if (fromJson.length) return fromJson;
  } catch {
    // noop: sometimes the model may return plain text; keep a tolerant fallback.
  }

  return trimmed
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 5);
}
