import { Suspense } from 'react';
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
