import { describe, expect, it } from 'vitest';
import { attention, SENTENCES } from './attention';

const argmax = (row: number[]) => row.indexOf(Math.max(...row));

describe('toy attention', () => {
  it('rows are probability distributions', () => {
    for (const s of SENTENCES.en) {
      for (const row of attention(s.tokens, 'meaning', 1, false)) {
        expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
      }
    }
  });
  it('the pronoun head resolves "it" to cat or mat depending on context', () => {
    const [tired, soft] = SENTENCES.en;
    expect(tired.tokens[argmax(attention(tired.tokens, 'pronoun', 1, false)[tired.focus])].text).toBe('cat');
    expect(soft.tokens[argmax(attention(soft.tokens, 'pronoun', 1, false)[soft.focus])].text).toBe('mat');
    const [hTired, hSoft] = SENTENCES.hu;
    expect(hTired.tokens[argmax(attention(hTired.tokens, 'pronoun', 1, false)[hTired.focus])].text).toBe('macska');
    expect(hSoft.tokens[argmax(attention(hSoft.tokens, 'pronoun', 1, false)[hSoft.focus])].text).toBe('szőnyegre,');
  });
  it('the verb head links a verb to its nouns', () => {
    const s = SENTENCES.en[2];
    const row = attention(s.tokens, 'verb', 1, false)[s.focus];
    const top2 = [...row.keys()].sort((a, b) => row[b] - row[a]).slice(0, 2).map((i) => s.tokens[i].text);
    expect(top2.sort()).toEqual(['ball', 'dog']);
  });
  it('a causal mask hides future tokens and low temperature sharpens', () => {
    const s = SENTENCES.en[0];
    const A = attention(s.tokens, 'meaning', 1, true);
    A.forEach((row, i) => row.forEach((v, j) => j > i && expect(v).toBe(0)));
    const sharp = attention(s.tokens, 'pronoun', 0.2, false)[s.focus];
    const soft = attention(s.tokens, 'pronoun', 3, false)[s.focus];
    expect(Math.max(...sharp)).toBeGreaterThan(Math.max(...soft));
  });
});
