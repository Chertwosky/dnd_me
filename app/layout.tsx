import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arcane Table',
  description:
    'Dark fantasy virtual tabletop для онлайн-сессий D&D: карта, токены, персонажи, мастерская сцены, журнал и прогрессия.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
