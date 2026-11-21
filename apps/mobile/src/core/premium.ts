/** PRD pricing and what Premium adds. Prices are shown from the store at purchase time once purchases are live. */
export const PREMIUM_PLANS = [
  { id: 'yearly', label: 'Yearly', price: 'US$19.99 / year', note: 'About S$27. Best value.' },
  { id: 'monthly', label: 'Monthly', price: 'US$2.99 / month', note: 'Cancel any time.' },
] as const;

export const PLAN_FEATURES: { feature: string; free: string; premium: string }[] = [
  { feature: 'Barcode scans', free: 'Unlimited', premium: 'Unlimited' },
  { feature: 'Label scans', free: '10 a day', premium: 'Unlimited' },
  { feature: 'AI re-checks', free: '3 a day', premium: 'Unlimited' },
  { feature: 'Strict mode and rule switches', free: 'Yes', premium: 'Yes' },
  { feature: 'History', free: 'On this phone', premium: 'Full history, synced and exportable' },
];

/**
 * Purchases go through RevenueCat (App Store and Google Play) once the account exists; until then nobody is
 * Premium and the upgrade screen says so. The adapter only has to set the stored flag.
 */
export const PURCHASES_LIVE = false;
