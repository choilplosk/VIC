import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'VIC · Studio Boti',
  description: 'Vendas In Company — O Boticário Niterói',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
