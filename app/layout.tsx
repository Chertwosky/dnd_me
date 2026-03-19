import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'D&D Game Table MVP',
  description:
    'MVP веб-платформы для онлайн-сессий D&D: карта, токены, карточки персонажей, лут, события и встроенная справка.',
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
