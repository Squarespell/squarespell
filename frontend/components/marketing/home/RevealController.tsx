'use client';

import { useEffect } from 'react';

/**
 * Reveals sections once as they enter the viewport. Skipped entirely for
 * prefers-reduced-motion users and browsers without IntersectionObserver.
 */
export function RevealController() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.remove('wait');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.08 },
    );
    document.querySelectorAll<HTMLElement>('.sqhome .reveal').forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add('wait');
        io.observe(el);
      }
    });
    return () => io.disconnect();
  }, []);
  return null;
}
