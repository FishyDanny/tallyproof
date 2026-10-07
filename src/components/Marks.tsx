import type { JSX } from 'preact';

/**
 * Small drawn marks used by the converter. Each is decorative: the words beside
 * it carry the meaning, so none is exposed to assistive technology.
 */

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 1.8,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
} as const;

/** A statement page with a folded corner and three ruled lines. */
export function DocMark({ class: className }: { class?: string }): JSX.Element {
  return (
    <svg class={className} viewBox="0 0 44 52" aria-hidden="true" focusable="false">
      <path d="M8 3h19l11 11v33a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" {...STROKE} stroke-width={2} />
      <path d="M27 3v9a2 2 0 0 0 2 2h9" {...STROKE} stroke-width={2} />
      <path d="M13 26h18M13 33h18M13 40h11" {...STROKE} stroke-width={2} />
    </svg>
  );
}

/** A tick, for a row whose figures agree with the printed balance. */
export function TickMark({ class: className }: { class?: string }): JSX.Element {
  return (
    <svg class={className} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M3 8.5 6.5 12 13 4.5" {...STROKE} stroke-width={2} />
    </svg>
  );
}

/** A flag, for a row to compare with the PDF. */
export function FlagMark({ class: className }: { class?: string }): JSX.Element {
  return (
    <svg class={className} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 14V2.5" {...STROKE} stroke-width={2} />
      <path d="M4 3h8l-1.8 3L12 9H4" fill="currentColor" stroke="currentColor" stroke-width={1.2} stroke-linejoin="round" />
    </svg>
  );
}

/** An open circle, for a row the balance check could not cover. */
export function OpenMark({ class: className }: { class?: string }): JSX.Element {
  return (
    <svg class={className} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="5" {...STROKE} stroke-width={1.8} />
    </svg>
  );
}

/** A tick inside a circle, for a statement summary that fully checks out. */
export function SealMark({ class: className }: { class?: string }): JSX.Element {
  return (
    <svg class={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9.5" {...STROKE} stroke-width={1.8} />
      <path d="M7.5 12.5 10.5 15.5 16.5 8.8" {...STROKE} stroke-width={2} />
    </svg>
  );
}

/** An exclamation inside a circle, for a statement with rows to compare with the PDF. */
export function AlertMark({ class: className }: { class?: string }): JSX.Element {
  return (
    <svg class={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9.5" {...STROKE} stroke-width={1.8} />
      <path d="M12 7.5v5.5" {...STROKE} stroke-width={2} />
      <circle cx="12" cy="16.6" r="1.1" fill="currentColor" />
    </svg>
  );
}
