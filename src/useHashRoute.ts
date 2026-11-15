import { useEffect, useState } from 'react';

/** Minimal hash router: "#/lesson/<id>" opens a lesson, anything else is home. */
export type Route = { name: 'home' } | { name: 'lesson'; id: string };

function parse(hash: string): Route {
  const m = hash.match(/^#\/lesson\/([\w-]+)/);
  return m ? { name: 'lesson', id: m[1] } : { name: 'home' };
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const lessonHref = (id: string) => `#/lesson/${id}`;
