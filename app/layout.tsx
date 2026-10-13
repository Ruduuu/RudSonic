import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RudSonic API',
  description: 'Music & SFX backend for RudSonic Premiere Pro Plugin',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
