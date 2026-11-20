import { assertEquals, assertThrows } from 'jsr:@std/assert@1.0.13';
import { geminiRequest, parseGemini } from './gemini.ts';

const wrap = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });

Deno.test('builds a JSON-schema request with the image first', () => {
  const r = geminiRequest('QUJD', 'image/jpeg');
  assertEquals(r.contents[0]!.parts[0], { inline_data: { mime_type: 'image/jpeg', data: 'QUJD' } });
  assertEquals(r.generationConfig.responseMimeType, 'application/json');
  assertEquals(r.generationConfig.temperature, 0);
});

Deno.test('parses and trims a valid answer', () => {
  const out = parseGemini(wrap(JSON.stringify({ ingredients: [' sugar ', '', 'cocoa butter'], may_contain: ['peanuts'], language: 'en' })));
  assertEquals(out, { ingredients: ['sugar', 'cocoa butter'], may_contain: ['peanuts'], language: 'en' });
});

Deno.test('tolerates a missing may_contain', () => {
  assertEquals(parseGemini(wrap(JSON.stringify({ ingredients: ['salt'], language: 'en' }))).may_contain, []);
});

Deno.test('rejects malformed answers', () => {
  assertThrows(() => parseGemini({}), Error, 'empty model response');
  assertThrows(() => parseGemini(wrap('not json')));
  assertThrows(() => parseGemini(wrap(JSON.stringify({ ingredients: 'sugar' }))), Error, 'schema');
});
