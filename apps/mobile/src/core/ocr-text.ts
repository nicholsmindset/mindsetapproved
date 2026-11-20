/** The subset of ML Kit's TextRecognitionResult the app uses. */
export interface OcrResult {
  text: string;
  blocks: Array<{
    text: string;
    frame?: { top: number; left: number; width: number; height: number };
    lines: Array<{ text: string; elements: Array<{ text: string }> }>;
  }>;
}

const WORDISH = /^[\p{L}][\p{L}'’-]*[\p{L}]?[.,;:)\]]*$|^\(?[\p{L}]+|^[eE]?\d{3,4}[a-z]?[),.]*$|^\(?\d+(?:[.,]\d+)?%[),.]*$/u;

/**
 * ML Kit gives no confidence score, so estimate one from the text itself: the share of tokens that look like
 * real words, E-numbers or percentages, scaled down when the label is very short or has no "Ingredients" header.
 */
export function estimateConfidence(text: string): number {
  const tokens = text.split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  const good = tokens.filter((t) => WORDISH.test(t)).length;
  let score = good / tokens.length;
  if (!/ingredi|komposisi|bahan/i.test(text)) score *= 0.9;
  if (tokens.length < 4) score *= 0.8;
  return Math.round(score * 100) / 100;
}

/**
 * Joins ML Kit blocks in reading order (top to bottom, then left to right), keeping line breaks so the
 * engine can rejoin hyphenated words.
 */
export function ocrToText(result: OcrResult): { text: string; confidence: number } {
  const blocks = [...result.blocks].sort((a, b) => {
    const ta = a.frame?.top ?? 0;
    const tb = b.frame?.top ?? 0;
    if (Math.abs(ta - tb) > 12) return ta - tb;
    return (a.frame?.left ?? 0) - (b.frame?.left ?? 0);
  });
  const text = blocks.length ? blocks.map((b) => b.lines.map((l) => l.text).join('\n')).join('\n') : result.text;
  return { text: text.trim(), confidence: estimateConfidence(text) };
}

/** Builds the label text from the AI re-check's structured answer, in a form the engine already parses. */
export function aiToText(ai: { ingredients: string[]; may_contain?: string[] }): string {
  const list = ai.ingredients.map((s) => s.trim()).filter(Boolean).join(', ');
  const may = (ai.may_contain ?? []).map((s) => s.trim()).filter(Boolean);
  return `Ingredients: ${list}.${may.length ? ` May contain ${may.join(', ')}.` : ''}`;
}
