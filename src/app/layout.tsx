import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Finance - Gestão Financeira Pessoal',
  description: 'Sistema de gestão financeira pessoal com receitas, despesas, cartões e parcelamentos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
