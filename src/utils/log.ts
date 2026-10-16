/** One place for swallowed-error reporting: console in dev, a hook for a crash reporter later. */
type Sink = (scope: string, error: unknown) => void;

let sink: Sink | null = null;

export function setErrorSink(next: Sink | null): void {
  sink = next;
}

/** Records an error that was handled (shown as a code or a toast) so its cause isn't lost. */
export function logError(scope: string, error: unknown): void {
  if (__DEV__) console.warn(`[${scope}]`, error);
  sink?.(scope, error);
}
