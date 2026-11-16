/**
 * A tiny next-word language model built by counting which word follows which.
 * Small enough to inspect, but it hallucinates for the same basic reason large
 * models can: it learns which words tend to follow each other, not which facts are true.
 */

export const START = '<s>';
export const END = '.';

export interface NgramModel {
  /** How many previous words the model looks at. */
  context: number;
  /** "w1 w2" (the last `context` words) → next word → count */
  counts: Map<string, Map<string, number>>;
  sentences: string[][];
}

export const tokenize = (s: string) => s.replace(/\./g, ' .').split(/\s+/).filter(Boolean);

export function buildNgram(corpus: string[], context: number): NgramModel {
  const counts = new Map<string, Map<string, number>>();
  const sentences = corpus.map(tokenize);
  for (const toks of sentences) {
    const seq = [...Array(context).fill(START), ...toks];
    for (let i = context; i < seq.length; i++) {
      const key = seq.slice(i - context, i).join(' ');
      const m = counts.get(key) ?? new Map<string, number>();
      m.set(seq[i], (m.get(seq[i]) ?? 0) + 1);
      counts.set(key, m);
    }
  }
  return { context, counts, sentences };
}

export interface NextWord {
  word: string;
  p: number;
}

/**
 * Probabilities of the next word after `prefix` (the words generated so far).
 * Temperature < 1 sharpens the distribution, > 1 flattens it.
 * With `grounded`, only words that continue a sentence of the corpus are allowed,
 * which is the idea behind looking facts up (retrieval) instead of guessing.
 */
export function nextWords(m: NgramModel, prefix: string[], temperature: number, grounded = false): NextWord[] {
  const seq = [...Array(m.context).fill(START), ...prefix];
  const key = seq.slice(seq.length - m.context).join(' ');
  const c = m.counts.get(key);
  if (!c) return [];
  let entries = [...c.entries()];
  if (grounded) {
    const ok = new Set<string>();
    for (const s of m.sentences)
      if (s.length > prefix.length && prefix.every((w, i) => s[i] === w)) ok.add(s[prefix.length]);
    entries = entries.filter(([w]) => ok.has(w));
    // the counts may not contain the continuation if the prefix was never seen whole
    if (!entries.length) entries = [...ok].map((w) => [w, 1]);
  }
  const t = Math.max(0.05, temperature);
  const weights = entries.map(([, n]) => Math.pow(n, 1 / t));
  const total = weights.reduce((a, b) => a + b, 0);
  return entries.map(([word], i) => ({ word, p: weights[i] / total })).sort((a, b) => b.p - a.p);
}

export function sampleWord(dist: NextWord[], rng: () => number): string | undefined {
  let r = rng();
  for (const d of dist) {
    r -= d.p;
    if (r <= 0) return d.word;
  }
  return dist[dist.length - 1]?.word;
}

/** True when the sentence (without the final full stop) appears word for word in the corpus. */
export function inCorpus(m: NgramModel, words: string[]): boolean {
  const s = words.join(' ');
  return m.sentences.some((t) => t.join(' ') === s);
}

export const CORPUS = {
  hu: [
    'Magyarország fővárosa Budapest.',
    'Franciaország fővárosa Párizs.',
    'Ausztria fővárosa Bécs.',
    'Olaszország fővárosa Róma.',
    'Japán fővárosa Tokió.',
    'Petőfi Sándor egy költő volt.',
    'Albert Einstein egy fizikus volt.',
    'Bartók Béla egy zeneszerző volt.',
    'Marie Curie egy kémikus volt.',
    'A Duna egy folyó.',
    'A Balaton egy tó.',
  ],
  en: [
    'The capital of Hungary is Budapest.',
    'The capital of France is Paris.',
    'The capital of Austria is Vienna.',
    'The capital of Italy is Rome.',
    'The capital of Japan is Tokyo.',
    'Sándor Petőfi was a poet.',
    'Albert Einstein was a physicist.',
    'Béla Bartók was a composer.',
    'Marie Curie was a chemist.',
    'The Danube is a river.',
    'Lake Balaton is a lake.',
  ],
};

/** Every sentence the model can produce after `prefix` (any temperature > 0), up to `limit`. */
export function possibleSentences(m: NgramModel, prefix: string[], grounded = false, limit = 500): string[][] {
  const out: string[][] = [];
  const walk = (seq: string[]) => {
    if (out.length >= limit) return;
    if (seq[seq.length - 1] === END || seq.length > 14) {
      out.push(seq);
      return;
    }
    for (const { word } of nextWords(m, seq, 1, grounded)) walk([...seq, word]);
  };
  walk(prefix);
  return out;
}

/** First words of the corpus sentences, in order, without repeats. */
export const openers = (m: NgramModel) => [...new Set(m.sentences.map((s) => s[0]))];
