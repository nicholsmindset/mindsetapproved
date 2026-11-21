import type { Metadata } from 'next';
import styles from '../site.module.css';
import { CorrectionForm } from './CorrectionForm';

export const metadata: Metadata = {
  title: 'Corrections | Mindset Approved',
  description: 'Report wrong ingredient data or a wrong verdict. Manufacturers welcome.',
};

export default function Corrections() {
  return (
    <div className={styles.prose}>
      <h1>Send a correction</h1>
      <p>
        Spotted wrong ingredient data or a verdict that doesn’t match the label? Manufacturers and shoppers can tell us here. Verdicts describe
        ingredients, never companies, and we fix errors quickly.
      </p>
      <CorrectionForm />
    </div>
  );
}
