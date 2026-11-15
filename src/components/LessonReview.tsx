import { useMemo, useState } from 'react';
import { useLang } from '../i18n/i18n';
import { createRng } from '../ml/random';
import { saveScore, useScores } from '../progress';
import { reviews } from '../lessons/quizzes';
import { categories, lessons } from '../lessons/registry';
import { lessonHref } from '../useHashRoute';

/** Deterministic option order per question, so the right answer is not always first. */
function shuffledOrder(seed: number, n: number): number[] {
  const rand = createRng(seed);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

function hash(s: string): number {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function LessonReview({ id }: { id: string }) {
  const { t, pick } = useLang();
  const review = reviews[id];
  const scores = useScores();
  const [answers, setAnswers] = useState<(number | null)[]>(() => review?.quiz.map(() => null) ?? []);
  const [attempt, setAttempt] = useState(0);

  const orders = useMemo(
    () => review?.quiz.map((q, i) => shuffledOrder(hash(`${id}:${i}:${attempt}`), q.options.length)) ?? [],
    [review, id, attempt],
  );

  // same order as the home page: by category, then registry order
  const ordered = categories.flatMap((c) => lessons.filter((l) => l.category === c.id && l.component));
  const pos = ordered.findIndex((l) => l.id === id);
  const prev = ordered[pos - 1];
  const next = ordered[pos + 1];
  const lesson = ordered[pos];
  const color = categories.find((c) => c.id === lesson?.category)?.color;

  if (!review) return null;
  const done = answers.every((a) => a !== null);
  const correct = answers.filter((a, i) => a === review.quiz[i].answer).length;

  const answer = (qi: number, opt: number) => {
    if (answers[qi] !== null) return;
    const nextAnswers = answers.map((a, i) => (i === qi ? opt : a));
    setAnswers(nextAnswers);
    if (nextAnswers.every((a) => a !== null)) {
      saveScore(id, nextAnswers.filter((a, i) => a === review.quiz[i].answer).length, review.quiz.length);
    }
  };

  const best = scores[id];

  return (
    <div className="review" style={{ '--accent': color } as React.CSSProperties}>
      <section className="explain summary">
        <h2>{t('summary')}</h2>
        <ul>
          {review.summary.map((s, i) => (
            <li key={i}>{pick(s)}</li>
          ))}
        </ul>
      </section>

      <section className="explain quiz">
        <h2>
          {t('quiz')}
          {best && <span className="best">{t('bestScore')}: {best.best}/{best.total}</span>}
        </h2>
        <ol>
          {review.quiz.map((q, qi) => {
            const chosen = answers[qi];
            return (
              <li key={qi}>
                <p className="question">{pick(q.q)}</p>
                <div className="options">
                  {orders[qi].map((oi) => {
                    let cls = 'option';
                    if (chosen !== null) {
                      if (oi === q.answer) cls += ' right';
                      else if (oi === chosen) cls += ' wrong';
                      else cls += ' dim';
                    }
                    return (
                      <button key={oi} className={cls} onClick={() => answer(qi, oi)} disabled={chosen !== null}>
                        {pick(q.options[oi])}
                      </button>
                    );
                  })}
                </div>
                {chosen !== null && (
                  <p className={chosen === q.answer ? 'feedback ok' : 'feedback no'}>
                    <b>{chosen === q.answer ? t('correct') : t('incorrect')}</b> {pick(q.explain)}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
        {done && (
          <div className="quiz-result">
            <b>
              {t('yourScore')}: {correct}/{review.quiz.length}
            </b>
            <button
              onClick={() => {
                setAnswers(review.quiz.map(() => null));
                setAttempt((a) => a + 1);
              }}
            >
              {t('retry')}
            </button>
          </div>
        )}
      </section>

      <nav className="lesson-nav">
        {prev ? (
          <a href={lessonHref(prev.id)}>
            <small>{t('prevLesson')}</small>
            {pick(prev.title)}
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a href={lessonHref(next.id)} className="next">
            <small>{t('nextLesson')}</small>
            {pick(next.title)}
          </a>
        ) : (
          <a href="#/" className="next">
            <small>{t('home')}</small>
            {t('allDone')}
          </a>
        )}
      </nav>
    </div>
  );
}
