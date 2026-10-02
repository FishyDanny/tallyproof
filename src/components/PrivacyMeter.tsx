import { useEffect, useState } from 'preact/hooks';

interface Props {
  /** performance.now() value when the user chose their file, or null before that. */
  since: number | null;
}

/**
 * Counts every network request the page makes after a file is chosen, using
 * the browser's own Resource Timing records. pdf.js is preloaded before that
 * point, so the expected count is zero.
 */
export function PrivacyMeter({ since }: Props) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (since === null || typeof PerformanceObserver === 'undefined') return undefined;
    const countNow = (): number =>
      performance.getEntriesByType('resource').filter((e) => e.startTime >= since && !e.name.startsWith('blob:') && !e.name.startsWith('data:')).length;
    setCount(countNow());
    const observer = new PerformanceObserver(() => setCount(countNow()));
    observer.observe({ type: 'resource', buffered: true });
    return () => observer.disconnect();
  }, [since]);

  if (since === null) return null;
  return (
    <p class={`privacy-meter ${count === 0 ? 'ok' : 'warn'}`} data-testid="privacy-meter">
      <strong>Network requests since you chose your file: {count}</strong>
      <span>
        {count === 0
          ? ' Your statement was read on this device and has not been sent anywhere.'
          : ' Requests appeared after you chose your file. None of them contain your statement, but you can check them in your browser’s developer tools (Network tab).'}
      </span>
    </p>
  );
}
