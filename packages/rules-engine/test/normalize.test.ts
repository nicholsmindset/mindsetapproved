import { describe, expect, it } from 'vitest';
import { cleanLabelText, normKey, stripFiller, stripPercent } from '../src';
import { pluralVariants } from '../src/normalize';

describe('normKey', () => {
  it.each([
    ['FD&C Red No. 40', 'fd c red no 40'],
    ['Glucose-Fructose Syrup', 'glucose fructose syrup'],
    ['  Canola   Oil ', 'canola oil'],
    ['Purée de tomate', 'puree de tomate'],
    ['Acesulfame-K', 'acesulfame k'],
    ['ＲＥＤ ４０', 'red 40'],
    ["Baker's yeast", 'bakers yeast'],
    ['E150d', 'e150d'],
    ['Monosodium L-Glutamate', 'monosodium l glutamate'],
  ])('%s -> %s', (input, out) => expect(normKey(input)).toBe(out));
});

describe('pluralVariants', () => {
  it.each([
    ['natural flavors', ['natural flavor']],
    ['strawberries', ['strawberry', 'strawberrie']],
    ['tomatoes', ['tomato', 'tomatoe']],
    ['glass', []],
    ['oil', []],
  ])('%s', (input, out) => expect(pluralVariants(input)).toEqual(out));
});

describe('cleanLabelText', () => {
  it('joins hyphenated line breaks', () => expect(cleanLabelText('SUN-\nFLOWER OIL')).toBe('SUNFLOWER OIL'));
  it('flattens newlines', () => expect(cleanLabelText('high fructose corn\nsyrup')).toBe('high fructose corn syrup'));
  it('unifies separators', () => expect(cleanLabelText('a; b · c • d | e')).toBe('a, b , c , d , e'));
  it('normalises full-width characters', () => expect(cleanLabelText('ＳＡＬＴ')).toBe('SALT'));
});

describe('stripFiller', () => {
  it('removes "contains 2% or less of"', () => expect(stripFiller('contains 2% or less of: salt').text).toBe('salt'));
  it('removes "less than 2% of"', () => expect(stripFiller('less than 2% of salt').text).toBe('salt'));
  it('removes "contains one or more of the following"', () =>
    expect(stripFiller('contains one or more of the following: canola oil').text).toBe('canola oil'));
  it('removes organic', () => expect(stripFiller('Organic cane sugar').text).toBe('cane sugar'));
  it('keeps expeller-pressed as a flag', () => {
    const r = stripFiller('expeller-pressed canola oil');
    expect(r.text).toBe('canola oil');
    expect(r.flags).toEqual(['expeller_pressed']);
  });
  it('flags expeller pressed on repeated calls', () => {
    expect(stripFiller('expeller pressed sunflower oil').flags).toEqual(['expeller_pressed']);
    expect(stripFiller('expeller pressed sunflower oil').flags).toEqual(['expeller_pressed']);
  });
  it('removes non-gmo', () => expect(stripFiller('non-GMO soybean oil').text).toBe('soybean oil'));
});

describe('stripPercent', () => {
  it.each([
    ['sugar 12%', 'sugar'],
    ['cocoa (25%)', 'cocoa'],
    ['12.5% milk', 'milk'],
    ['tomatoes [65 %]', 'tomatoes'],
    ['salt 1,5%', 'salt'],
  ])('%s', (input, out) => expect(stripPercent(input)).toBe(out));
});
