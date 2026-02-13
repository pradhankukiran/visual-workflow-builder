/**
 * A debounced function that exposes a `cancel` method.
 */
export interface DebouncedFunction<Args extends unknown[]> {
  (...args: Args): void;
  cancel: () => void;
}

/**
 * Create a debounced version of a function that delays invocation
 * until after `delayMs` milliseconds have elapsed since the last call.
 *
 * @param fn      - The function to debounce.
 * @param delayMs - Delay in milliseconds.
 * @returns A debounced function with a `.cancel()` method.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number,
): DebouncedFunction<Args> {
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Args): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      timerId = null;
      fn(...args);
    }, delayMs);
  };

  debounced.cancel = (): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return debounced;
}
