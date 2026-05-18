import { describe, expect, it } from 'vitest';
import { normalizeTitleText } from './titleText.js';

describe('normalizeTitleText', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeTitleText('  Dune   Part   Two  ')).toBe('Dune Part Two');
  });

  it('replaces line breaks with spaces', () => {
    expect(normalizeTitleText('Mrs Harris\nGoes to\nParis')).toBe('Mrs Harris Goes to Paris');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeTitleText('   \n  ')).toBe('');
  });
});
