/** PRD-mandated wording. Keep it neutral: no health claims. */
export const DISCLAIMER =
  'Mindset Approved is not a medical device and does not diagnose, treat, cure or prevent any condition. Verdicts reflect Mindset’s ingredient preferences. Talk to a healthcare professional about your diet.';

export const OFF_ATTRIBUTION = 'Contains data from Open Food Facts, available under the Open Database License.';

/** Manufacturer and user correction channel (PRD). Set EXPO_PUBLIC_CORRECTIONS_EMAIL; the link is hidden until then. */
export const CORRECTIONS_EMAIL = process.env.EXPO_PUBLIC_CORRECTIONS_EMAIL ?? '';

export const REPORT_REASONS = [
  'An ingredient was misread',
  'Flagged something that isn’t there',
  'Missed a flagged ingredient',
  'Wrong product',
  'Other',
] as const;
