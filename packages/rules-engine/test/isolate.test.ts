import { describe, expect, it } from 'vitest';
import { isolateIngredients } from '../src';

describe('isolateIngredients', () => {
  it('finds the block after "Ingredients:"', () => {
    const r = isolateIngredients('Crunchy! INGREDIENTS: corn, salt. Nutrition Facts 100 kcal');
    expect(r.block).toBe('corn, salt');
    expect(r.headerFound).toBe(true);
  });
  it('accepts "Ingredient:" and a full-width colon', () => {
    expect(isolateIngredients('Ingredient：water, salt').block).toBe('water, salt');
  });
  it('falls back to the whole text with no header', () => {
    const r = isolateIngredients('water, salt, sugar');
    expect(r.headerFound).toBe(false);
    expect(r.block).toBe('water, salt, sugar');
  });
  it.each([
    ['Allergen information: milk', 'Ingredients: rice, water. Allergen information: milk'],
    ['Contains:', 'Ingredients: rice, water. Contains: milk'],
    ['Contains (sentence)', 'Ingredients: rice, water. Contains milk and soy.'],
    ['Storage', 'Ingredients: rice, water Storage: cool dry place'],
    ['Best before', 'Ingredients: rice, water Best before 12/2027'],
    ['Manufactured by', 'Ingredients: rice, water Manufactured by ACME'],
    ['Net wt', 'Ingredients: rice, water NET WT 100g'],
    ['Product of', 'Ingredients: rice, water Product of Thailand'],
    ['Made in', 'Ingredients: rice, water Made in Singapore'],
    ['Keep refrigerated', 'Ingredients: rice, water Keep refrigerated'],
  ])('stops at %s', (_label, text) => expect(isolateIngredients(text).block).toBe('rice, water'));
  it('does not stop at "contains 2% or less of"', () => {
    expect(isolateIngredients('Ingredients: corn, contains 2% or less of salt').block).toBe('corn, contains 2% or less of salt');
  });
  it('moves "may contain" into notes', () => {
    const r = isolateIngredients('Ingredients: oats, honey. May contain traces of nuts.');
    expect(r.block).toBe('oats, honey');
    expect(r.notes).toEqual(['May contain traces of nuts']);
  });
  it('moves facility statements into notes', () => {
    const r = isolateIngredients('Ingredients: oats, honey. Produced in a facility that also handles peanuts.');
    expect(r.notes).toEqual(['Produced in a facility that also handles peanuts']);
    expect(r.block).toBe('oats, honey');
  });
  it('keeps "No. 40" intact', () => {
    expect(isolateIngredients('Ingredients: sugar, FD&C Red No. 40, salt').block).toBe('sugar, FD&C Red No. 40, salt');
  });
  it('treats a sentence break as a separator', () => {
    expect(isolateIngredients('Ingredients: sugar. salt').block).toBe('sugar, salt');
  });
  it('strips a trailing period', () => expect(isolateIngredients('Ingredients: sugar, salt.').block).toBe('sugar, salt'));
  it('handles empty text', () => expect(isolateIngredients('').block).toBe(''));
});
