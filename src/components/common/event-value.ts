/**
 * Reads the value carried by a component event.
 *
 * Custom-component events deliver `eventValue(e)`; native DOM events (input,
 * change) bubbling out of a component's shadow root have no detail, so fall
 * back to the value of the composed-path target. Prevents TypeErrors when a
 * handler assumes `e.detail` exists.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function eventValue(e: Event): any {
  const detail = (e as CustomEvent).detail;
  if (detail && (typeof detail.value === 'string' || typeof detail.value === 'number')) {
    return detail.value;
  }
  const target = e.composedPath()[0] as HTMLInputElement | null;
  return target && typeof target.value === 'string' ? target.value : undefined;
}
