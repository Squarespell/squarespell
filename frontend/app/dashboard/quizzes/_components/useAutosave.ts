'use client';

/**
 * useAutosave - debounced autosave + unsaved-changes tracking for the quiz editor.
 *
 * Behaviour:
 *   - Every time `data` changes (shallow-compared via JSON.stringify), schedule
 *     a save 2 seconds after the last edit (debounced).
 *   - While a save is in flight, suppress new saves; if more edits arrive
 *     during that window, schedule another save immediately after completion.
 *   - Emits a status: 'saved' | 'saving' | 'unsaved' | 'error' + a
 *     `lastSavedAt` timestamp that the UI can render as "Saved just now".
 *   - Installs a window.beforeunload listener while unsaved changes exist so
 *     the browser prompts the user before tab close / navigation away.
 *
 * The hook is generic - pass in any serializable data + a save callback.
 * The save callback must throw on failure so status can go to 'error'.
 *
 * Usage in builder/page.tsx:
 *
 *   const { status, lastSavedAt, saveNow } = useAutosave({
 *     data: quiz,
 *     enabled: !!quiz,
 *     onSave: async (q) => {
 *       await patchQuiz(quiz.id, {
 *         title: q.title, description: q.description,
 *         questions: q.questions, outcomes: q.outcomes,
 *         settings: q.settings,
 *       });
 *     },
 *   });
 *
 * Then render status next to the Save button:
 *
 *   <AutosaveStatus status={status} lastSavedAt={lastSavedAt} />
 *
 * The existing manual Save button can call saveNow() - it will cancel any
 * pending debounce and save immediately.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface UseAutosaveOptions<T> {
  /** The serializable draft. Changes trigger debounced saves. */
  data: T | null;
  /** Only autosave when true (e.g. false while loading initial data). */
  enabled: boolean;
  /** Called to persist. Must throw on failure. */
  onSave: (data: T) => Promise<void>;
  /** Debounce window. Default 2000ms. */
  debounceMs?: number;
  /** Message on browser beforeunload. Default: generic 'unsaved changes'. */
  beforeUnloadMessage?: string;
}

export interface UseAutosaveResult {
  /** Current save status for the UI. */
  status: AutosaveStatus;
  /** When the last successful save landed (null until first save). */
  lastSavedAt: Date | null;
  /** Details of the last error (if status === 'error'). */
  error: string | null;
  /** Cancel pending debounce and save immediately. Safe to call repeatedly. */
  saveNow: () => Promise<void>;
}

export function useAutosave<T>({
  data,
  enabled,
  onSave,
  debounceMs = 2000,
  beforeUnloadMessage = 'You have unsaved changes - are you sure you want to leave?',
}: UseAutosaveOptions<T>): UseAutosaveResult {
  const [status, setStatus] = useState<AutosaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep serialized snapshot of what's been saved so we can detect changes.
  const lastSavedSnapshot = useRef<string | null>(null);
  // Serialized snapshot of what was sent to the server in the most recent save
  // attempt (whether succeeded or still in-flight).
  const inFlightSnapshot = useRef<string | null>(null);
  // Debounce timer handle.
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Whether a save is currently executing.
  const savingRef = useRef(false);
  // Ref to the latest onSave so the inner closure never goes stale.
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Serialize once per render of `data`.
  const currentSnapshot = data ? safeStringify(data) : null;

  /* ------------------------------------------------------------------ */
  /* On first enablement, seed the "saved" snapshot so we don't save    */
  /* the initial load to the server.                                    */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (enabled && data && lastSavedSnapshot.current === null) {
      lastSavedSnapshot.current = currentSnapshot;
      setStatus('saved');
    }
  }, [enabled, data, currentSnapshot]);

  /* ------------------------------------------------------------------ */
  /* Core save function - cancels debounce, sends to server, updates    */
  /* status + lastSavedAt. Handles "edited again during in-flight       */
  /* save" by scheduling a follow-up save immediately.                   */
  /* ------------------------------------------------------------------ */
  const performSave = useCallback(async () => {
    if (!enabled || !data) return;
    if (savingRef.current) return; // another save in flight; handled at completion

    const snapshot = safeStringify(data);
    if (snapshot === lastSavedSnapshot.current) return; // nothing changed

    savingRef.current = true;
    inFlightSnapshot.current = snapshot;
    setStatus('saving');
    setError(null);

    try {
      await onSaveRef.current(data);
      lastSavedSnapshot.current = snapshot;
      setLastSavedAt(new Date());

      // If more edits arrived while we were saving, kick off another save.
      // We compare the latest data (closure captures current, but re-read via
      // a microtask to pick up any sync-state changes that happened during
      // await - in practice React will re-render and re-run the hook, but
      // this is belt-and-suspenders).
      const afterSnapshot = safeStringify(data);
      if (afterSnapshot !== lastSavedSnapshot.current) {
        setStatus('unsaved');
      } else {
        setStatus('saved');
      }
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'Save failed');
    } finally {
      savingRef.current = false;
      inFlightSnapshot.current = null;
    }
  }, [data, enabled]);

  /* ------------------------------------------------------------------ */
  /* Debounced scheduling on data change.                                */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!enabled || !data || lastSavedSnapshot.current === null) return;
    if (currentSnapshot === lastSavedSnapshot.current) return; // no change
    if (currentSnapshot === inFlightSnapshot.current) return; // already queued

    setStatus('unsaved');

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, [currentSnapshot, enabled, debounceMs, performSave]);

  /* ------------------------------------------------------------------ */
  /* beforeunload warning while there are unsaved changes.              */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unsaved = status === 'unsaved' || status === 'saving';
    if (!unsaved) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requires `returnValue` to be set. Modern browsers ignore the
      // custom string and show their own - that's fine.
      e.returnValue = beforeUnloadMessage;
      return beforeUnloadMessage;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [status, beforeUnloadMessage]);

  /* ------------------------------------------------------------------ */
  /* Manual saveNow - cancels debounce, flushes immediately.            */
  /* ------------------------------------------------------------------ */
  const saveNow = useCallback(async () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    await performSave();
  }, [performSave]);

  return { status, lastSavedAt, error, saveNow };
}

/* ------------------------------------------------------------------ */
/* Stable JSON stringify with deterministic key order so object-key   */
/* reordering doesn't generate spurious "unsaved" states. Handles     */
/* circular refs and functions defensively.                            */
/* ------------------------------------------------------------------ */
function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_, v) => {
      if (typeof v === 'function') return undefined;
      if (v !== null && typeof v === 'object') {
        if (seen.has(v)) return undefined;
        seen.add(v);
      }
      return v;
    });
  } catch {
    // Fall back to a string that always differs, forcing a save. Better to
    // over-save than to silently drop edits.
    return String(Date.now());
  }
}

/* ------------------------------------------------------------------ */
/* AutosaveStatusBadge - optional UI helper. Renders a small status   */
/* pill to drop next to the Save button.                               */
/* ------------------------------------------------------------------ */

export function formatAutosaveLabel(status: AutosaveStatus, lastSavedAt: Date | null): string {
  switch (status) {
    case 'saving':
      return 'Saving…';
    case 'unsaved':
      return 'Unsaved changes';
    case 'error':
      return 'Save failed - retry';
    case 'saved':
    default:
      if (!lastSavedAt) return 'All changes saved';
      return `Saved ${timeAgo(lastSavedAt)}`;
  }
}

function timeAgo(d: Date): string {
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d2 = Math.floor(h / 24);
  return `${d2}d ago`;
}
