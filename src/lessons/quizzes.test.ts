import { describe, expect, it } from 'vitest';
import { lessons } from './registry';
import { reviews } from './quizzes';

describe('lesson reviews', () => {
  it('every built lesson has a summary and a well-formed quiz', () => {
    for (const l of lessons.filter((x) => x.component)) {
      const r = reviews[l.id];
      expect(r, l.id).toBeDefined();
      expect(r.summary.length).toBeGreaterThanOrEqual(3);
      expect(r.quiz.length).toBeGreaterThanOrEqual(3);
      for (const q of r.quiz) {
        expect(q.options.length).toBeGreaterThanOrEqual(3);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
        for (const t of [q.q, q.explain, ...q.options]) expect(t.hu && t.en).toBeTruthy();
      }
    }
  });
});
