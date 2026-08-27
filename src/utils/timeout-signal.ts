/**
 * Composite AbortSignal Utility
 *
 * Returns an AbortSignal that fires after `timeoutMs` milliseconds OR when
 * `parentSignal` is aborted — whichever comes first.  Always call `cleanup()`
 * in a `finally` block to prevent timer / event-listener leaks.
 *
 * @example
 * const { signal, cleanup } = createTimeoutSignal(30_000, userSignal);
 * try {
 *   const res = await fetch(url, { signal });
 * } finally {
 *   cleanup();
 * }
 */
export function createTimeoutSignal(
  timeoutMs = 30_000,
  parentSignal?: AbortSignal
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();

  // Fire timeout
  const timer = setTimeout(() => {
    controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  // Propagate parent cancellation
  const onParentAbort = () => {
    clearTimeout(timer);
    controller.abort(parentSignal?.reason ?? new Error('Aborted by user'));
  };

  if (parentSignal) {
    if (parentSignal.aborted) {
      // Already aborted — cancel immediately
      clearTimeout(timer);
      controller.abort(parentSignal.reason ?? new Error('Aborted by user'));
    } else {
      parentSignal.addEventListener('abort', onParentAbort, { once: true });
    }
  }

  const cleanup = () => {
    clearTimeout(timer);
    if (parentSignal && !parentSignal.aborted) {
      parentSignal.removeEventListener('abort', onParentAbort);
    }
  };

  return { signal: controller.signal, cleanup };
}
