/**
 * A hand-built toy self-attention model. Real transformers learn their word
 * vectors and query/key matrices; here they are written by hand so each
 * "head" has one clear, explainable job.
 */

/** Feature dimensions of the toy word vectors. */
export const FEATURES = ['animal', 'thing', 'place', 'action', 'property', 'function'] as const;
export type Features = [number, number, number, number, number, number];

export interface Token {
  text: string;
  f: Features;
  /** For pronouns: what an earlier layer has already learned it refers to. */
  ref?: 'animal' | 'thing';
}

export type HeadId = 'meaning' | 'neighbour' | 'pronoun' | 'verb';
export const HEADS: HeadId[] = ['pronoun', 'verb', 'meaning', 'neighbour'];

const F = (animal = 0, thing = 0, place = 0, action = 0, property = 0, func = 0): Features => [animal, thing, place, action, property, func];

const LEX: Record<string, Features> = {
  // English
  the: F(0, 0, 0, 0, 0, 1), on: F(0, 0, 0.3, 0, 0, 1), because: F(0, 0, 0, 0, 0, 1), was: F(0, 0, 0, 0.3, 0, 0.8),
  across: F(0, 0, 0.4, 0, 0, 1), cat: F(1, 0, 0, 0, 0, 0), dog: F(1, 0, 0, 0, 0, 0), mat: F(0, 1, 0.3, 0, 0, 0),
  ball: F(0, 1, 0, 0, 0, 0), park: F(0, 0.2, 1, 0, 0, 0), sat: F(0, 0, 0, 1, 0, 0), chased: F(0, 0, 0, 1, 0, 0),
  tired: F(0.3, 0, 0, 0, 1, 0), soft: F(0, 0.3, 0, 0, 1, 0), big: F(0, 0, 0, 0, 1, 0),
  // Hungarian
  a: F(0, 0, 0, 0, 0, 1), az: F(0, 0, 0, 0, 0, 0.3), mert: F(0, 0, 0, 0, 0, 1), volt: F(0, 0, 0, 0.3, 0, 0.8),
  macska: F(1, 0, 0, 0, 0, 0), kutya: F(1, 0, 0, 0, 0, 0), szőnyegre: F(0, 1, 0.3, 0, 0, 0), labdát: F(0, 1, 0, 0, 0, 0),
  parkban: F(0, 0.2, 1, 0, 0, 0), leült: F(0, 0, 0, 1, 0, 0), kergette: F(0, 0, 0, 1, 0, 0), fáradt: F(0.3, 0, 0, 0, 1, 0),
  puha: F(0, 0.3, 0, 0, 1, 0), nagy: F(0, 0, 0, 0, 1, 0), ő: F(0, 0, 0, 0, 0, 0.3),
};

const word = (text: string, ref?: Token['ref']): Token => {
  const key = text.toLowerCase().replace(/[.,]/g, '');
  const pronoun = key === 'it' || key === 'ő' || key === 'az';
  return { text, f: pronoun ? F(0, 0, 0, 0, 0, 0.3) : (LEX[key] ?? F(0, 0, 0, 0, 0, 1)), ref: pronoun ? ref : undefined };
};

export interface Sentence {
  id: string;
  tokens: Token[];
  /** Index of the most interesting token to select first. */
  focus: number;
}

export const SENTENCES: Record<'hu' | 'en', Sentence[]> = {
  en: [
    { id: 'tired', focus: 7, tokens: ['The', 'cat', 'sat', 'on', 'the', 'mat', 'because', 'it', 'was', 'tired.'].map((w) => word(w, 'animal')) },
    { id: 'soft', focus: 7, tokens: ['The', 'cat', 'sat', 'on', 'the', 'mat', 'because', 'it', 'was', 'soft.'].map((w) => word(w, 'thing')) },
    { id: 'dog', focus: 2, tokens: ['The', 'dog', 'chased', 'the', 'big', 'ball', 'across', 'the', 'park.'].map((w) => word(w)) },
  ],
  hu: [
    { id: 'tired', focus: 6, tokens: ['A', 'macska', 'leült', 'a', 'szőnyegre,', 'mert', 'ő', 'fáradt', 'volt.'].map((w) => word(w, 'animal')) },
    { id: 'soft', focus: 6, tokens: ['A', 'macska', 'leült', 'a', 'szőnyegre,', 'mert', 'az', 'puha', 'volt.'].map((w) => word(w, 'thing')) },
    { id: 'dog', focus: 2, tokens: ['A', 'kutya', 'kergette', 'a', 'nagy', 'labdát', 'a', 'parkban.'].map((w) => word(w)) },
  ],
};

const dot = (a: Features, b: Features) => a.reduce((s, v, i) => s + v * b[i], 0);

/** Raw attention scores (query i → key j) for one head, before softmax. */
export function scores(tokens: Token[], head: HeadId): number[][] {
  return tokens.map((qi, i) =>
    tokens.map((kj, j) => {
      switch (head) {
        case 'meaning':
          return 3 * dot(qi.f, kj.f);
        case 'neighbour': {
          const d = Math.abs(i - j);
          return -1.5 * (d - 1) * (d - 1);
        }
        case 'pronoun':
          if (qi.ref) return 4 * kj.f[qi.ref === 'animal' ? 0 : 1];
          return i === j ? 3 : 0;
        case 'verb':
          if (qi.f[3] >= 1) return 3 * (kj.f[0] + kj.f[1]);
          if (qi.f[0] >= 1 || qi.f[1] >= 1) return 3 * kj.f[3] + (i === j ? 1 : 0);
          return i === j ? 3 : 0;
      }
    }),
  );
}

/** Row-wise softmax with temperature; with `causal`, a token can only look at itself and earlier tokens. */
export function attention(tokens: Token[], head: HeadId, temperature: number, causal: boolean): number[][] {
  return scores(tokens, head).map((row, i) => {
    const masked = row.map((s, j) => (causal && j > i ? -Infinity : s / Math.max(temperature, 1e-3)));
    const m = Math.max(...masked);
    const e = masked.map((s) => (s === -Infinity ? 0 : Math.exp(s - m)));
    const z = e.reduce((a, b) => a + b, 0) || 1;
    return e.map((v) => v / z);
  });
}

/** 3D display position of a word vector (a fixed projection of the 6 features, plus a little jitter). */
export function displayPos(t: Token): [number, number, number] {
  const f = t.f;
  let h = 0;
  for (const c of t.text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const j = (k: number) => (((h >> (k * 5)) & 31) / 31 - 0.5) * 0.5;
  return [2.2 * f[0] - 2.2 * f[1] + j(0), 2.2 * f[3] - 1.2 * f[5] + 0.6 + j(1), 2.2 * f[2] - 2.2 * f[4] + j(2)];
}

/** Context-mixed output for token i: the attention-weighted average of everyone's display position. */
export function mixedPos(tokens: Token[], weights: number[]): [number, number, number] {
  const out: [number, number, number] = [0, 0, 0];
  tokens.forEach((t, j) => {
    const p = displayPos(t);
    for (let k = 0; k < 3; k++) out[k] += weights[j] * p[k];
  });
  return out;
}
