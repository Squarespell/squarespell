import { useEffect, useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Standard shadcn/ui class-merging helper, used only by dashboard components. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Radix's `*.Portal` primitives (Sheet, DropdownMenu, Tooltip, ...) render
 * their content as a direct child of `document.body` by default -- which
 * means it lands OUTSIDE `.dashboard-root` in the actual DOM, even though it
 * sits inside it in the React tree. Every design token (--background,
 * --sidebar, --primary, ...) is deliberately scoped to `.dashboard-root`
 * rather than :root (so the dashboard's Tailwind theme can never bleed onto
 * the marketing homepage, which shares this same stylesheet bundle once
 * loaded) -- so a portaled node outside that wrapper inherits none of them,
 * and every color utility on it silently resolves to transparent/invalid.
 *
 * Passing this hook's return value as each Portal's `container` prop keeps
 * the portaled DOM node inside `.dashboard-root`, restoring token
 * inheritance without weakening the isolation (fixed-position children still
 * cover the full viewport regardless of DOM nesting, since `.dashboard-root`
 * sets no transform).
 *
 * This has to be a hook, not a plain `document.querySelector()` call made
 * directly in a component's render body: a component like the header's
 * DropdownMenu has no React state of its own tracking open/closed (Radix
 * manages that internally), so nothing forces its render function to run
 * again after the very first render -- and on that first render, `.dashboard
 * -root` may not exist in the live DOM yet (React's render phase runs before
 * the commit that actually inserts DOM nodes). A plain function call there
 * captures `undefined` once and keeps it forever. `useEffect` runs after
 * commit, when every ancestor -- including `.dashboard-root` -- is
 * guaranteed to already be in the DOM, so it resolves correctly and only
 * needs to happen once (well before the user has a chance to open anything).
 */
export function useDashboardPortalContainer(): HTMLElement | undefined {
  const [container, setContainer] = useState<HTMLElement | undefined>(undefined);
  useEffect(() => {
    setContainer(document.querySelector<HTMLElement>('.dashboard-root') ?? undefined);
  }, []);
  return container;
}
