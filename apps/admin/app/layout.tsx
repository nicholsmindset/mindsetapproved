import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mindset Approved',
  description: 'Scan a food label and see whether it meets Mindset ingredient rules.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
