import { Suspense, useEffect } from 'react';
import { useLang } from './i18n/i18n';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './components/Home';
import { LessonReview } from './components/LessonReview';
import { findLesson } from './lessons/registry';
import { useHashRoute } from './useHashRoute';

export function App() {
  const route = useHashRoute();
  const lesson = route.name === 'lesson' ? findLesson(route.id) : undefined;
  const Lesson = lesson?.component;
  const { t, pick } = useLang();

  useEffect(() => {
    document.title = lesson ? `${pick(lesson.title)} · ${t('siteTitle')}` : `${t('siteTitle')} · ${pick({ hu: 'gépi tanulás 3D-ben', en: 'machine learning in 3D' })}`;
  }, [lesson, pick, t]);

  return (
    <>
      <Header />
      <main>
        {Lesson && lesson ? (
          <Suspense fallback={<div className="loading">…</div>}>
            <Lesson />
            <LessonReview key={lesson.id} id={lesson.id} />
          </Suspense>
        ) : (
          <Home />
        )}
      </main>
      <Footer />
    </>
  );
}
