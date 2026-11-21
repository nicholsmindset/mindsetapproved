'use client';
import { useActionState } from 'react';
import { sendCorrection, type CorrectionState } from './actions';

export function CorrectionForm() {
  const [state, action, pending] = useActionState<CorrectionState, FormData>(sendCorrection, {});
  if (state.ok) {
    return (
      <div className="flash ok" role="status">
        Thanks. We review every correction and fix errors quickly. If you left an email, we’ll reply there.
      </div>
    );
  }
  return (
    <form action={action} className="card stack">
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="small muted" style={{ marginBottom: 6 }}>
          I am
        </legend>
        <label className="inline">
          <input type="radio" name="kind" value="shopper" defaultChecked /> A shopper
        </label>
        <label className="inline">
          <input type="radio" name="kind" value="manufacturer" /> From the manufacturer or brand
        </label>
      </fieldset>
      <div className="grid2">
        <div>
          <label htmlFor="product">Product name</label>
          <input id="product" name="product" type="text" required maxLength={200} />
        </div>
        <div>
          <label htmlFor="barcode">Barcode (optional)</label>
          <input id="barcode" name="barcode" type="text" inputMode="numeric" maxLength={20} />
        </div>
      </div>
      <div>
        <label htmlFor="message">What’s wrong?</label>
        <textarea id="message" name="message" required minLength={10} maxLength={4000} rows={6} style={{ fontFamily: 'var(--font)' }} placeholder="e.g. The recipe changed in 2026 and no longer contains Red 40." />
      </div>
      <div>
        <label htmlFor="email">Email for our reply (optional)</label>
        <input id="email" name="email" type="email" maxLength={254} />
      </div>
      <div aria-hidden style={{ position: 'absolute', left: -10000, width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {state.error ? (
        <div className="flash error" role="alert">
          {state.error}
        </div>
      ) : null}
      <div>
        <button className="primary" type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send correction'}
        </button>
      </div>
    </form>
  );
}
