import { useState } from 'preact/hooks';
import { forgetLicence, isActive, licenceConfig, validateLicence } from '../lib/licence.ts';
import type { LicenceState } from '../lib/licence.ts';

interface Props {
  licence: LicenceState | null;
  configured: boolean;
  onChange: (state: LicenceState | null) => void;
}

export function LicencePanel({ licence, configured, onChange }: Props) {
  const [key, setKey] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const active = isActive(licence);

  if (!configured) return null;

  if (active && licence) {
    return (
      <p class="licence active" data-testid="licence-active">
        Pro is active on this browser{licence.expiresAt ? ` until ${licence.expiresAt.slice(0, 10)}` : ''}.{' '}
        <button
          type="button"
          class="link"
          onClick={() => {
            forgetLicence();
            onChange(null);
          }}
        >
          Remove key
        </button>
      </p>
    );
  }

  const submit = async (e: Event) => {
    e.preventDefault();
    const config = licenceConfig();
    if (!config || key.trim().length === 0) return;
    setChecking(true);
    setMessage(null);
    try {
      const state = await validateLicence(key, config);
      if (state.valid) {
        onChange(state);
        setKey('');
      } else {
        setMessage('That key was not recognised, or it has expired. Check it against your purchase email.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The key could not be checked. Try again in a minute.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <details class="licence">
      <summary>Have a Pro licence key?</summary>
      <form onSubmit={(e) => void submit(e)}>
        <label>
          Licence key
          <input
            type="text"
            value={key}
            autoComplete="off"
            spellcheck={false}
            onInput={(e) => setKey(e.currentTarget.value)}
            placeholder="Paste the key from your purchase email"
          />
        </label>
        <button type="submit" disabled={checking || key.trim().length === 0}>
          {checking ? 'Checking…' : 'Activate'}
        </button>
      </form>
      <p class="fine">Activating sends only the key to our payment provider (Polar) to check it. Your statements are never sent.</p>
      {message && (
        <p class="error" role="alert">
          {message}
        </p>
      )}
    </details>
  );
}
