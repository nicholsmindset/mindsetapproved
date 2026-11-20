// Gemini request/response handling, separated from the HTTP handler so it can be tested without a key.

export interface AiLabel {
  ingredients: string[];
  may_contain: string[];
  language: string;
}

export const PROMPT = `You read food packaging. Find the ingredient list in this photo and transcribe it exactly.
Rules:
- Copy each ingredient as printed, keeping sub-ingredients in brackets on the same item, e.g. "chocolate (sugar, cocoa butter)".
- Keep E-numbers, INS numbers and percentages as printed.
- Put "may contain" / "traces of" / "made in a facility" items in may_contain, not ingredients.
- Ignore nutrition tables, allergen summaries ("Contains: milk"), storage text and marketing.
- Do not add, guess, translate or judge ingredients. If no ingredient list is readable, return an empty list.
- language: the ISO 639-1 code of the list as printed.`;

export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    ingredients: { type: 'ARRAY', items: { type: 'STRING' } },
    may_contain: { type: 'ARRAY', items: { type: 'STRING' } },
    language: { type: 'STRING' },
  },
  required: ['ingredients', 'may_contain', 'language'],
};

export function geminiRequest(imageBase64: string, mimeType: string) {
  return {
    contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mimeType, data: imageBase64 } }, { text: PROMPT }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
  };
}

/** Validates the model's JSON; throws on anything that doesn't match the schema. */
export function parseGemini(body: unknown): AiLabel {
  const text = (body as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('');
  if (!text) throw new Error('empty model response');
  const parsed = JSON.parse(text) as Partial<AiLabel>;
  const strings = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');
  if (!strings(parsed.ingredients) || !strings(parsed.may_contain ?? [])) throw new Error('model response does not match the schema');
  return {
    ingredients: (parsed.ingredients as string[]).map((s) => s.trim()).filter(Boolean).slice(0, 200),
    may_contain: ((parsed.may_contain ?? []) as string[]).map((s) => s.trim()).filter(Boolean).slice(0, 50),
    language: typeof parsed.language === 'string' ? parsed.language.slice(0, 8) : 'und',
  };
}
