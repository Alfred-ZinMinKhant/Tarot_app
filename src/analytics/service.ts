/** Event properties are plain values only: never free text the user typed. */
export type EventProps = Record<string, string | number | boolean | null>;

export interface AnalyticsService {
  capture(event: string, props?: EventProps): void;
  screen(name: string): void;
  /** Properties attached to every later event (language, premium). */
  register(props: EventProps): void;
  captureException(error: unknown, props?: EventProps): void;
  /** Stops (or resumes) sending anything, for the Settings switch. */
  setEnabled(enabled: boolean): void;
  /** A fresh anonymous ID, after "Delete my data". */
  reset(): void;
}
