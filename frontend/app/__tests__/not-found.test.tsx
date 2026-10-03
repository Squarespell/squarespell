/**
 * App 404 page (app/not-found.tsx): its own title and a way back (SEO plan Segment 1, task 1.9, and Segment 3, task 3.9).
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import NotFound, { metadata } from '../not-found';

describe('not-found page', () => {
  it('has the title "Page not found | Squarespell Quiz"', () => {
    expect(metadata.title).toBe('Page not found | Squarespell Quiz');
  });

  it('says "Page not found" and links to the dashboard and to squarespellquiz.com', () => {
    const { container } = render(<NotFound />);
    expect(container.querySelector('h1')?.textContent?.trim()).toBe('Page not found');
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('https://squarespellquiz.com');
  });
});
