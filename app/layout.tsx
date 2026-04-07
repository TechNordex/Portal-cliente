import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nordex Tech — Portal do Cliente',
  description:
    'Portal exclusivo para clientes Nordex Tech. Acompanhe seus projetos, atualizações e comunicações em tempo real.',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#090909',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    /**
     * className="dark" — força o seletor .dark estar presente no <html>
     * para que os utilitários dark:xxx do Tailwind e os @custom-variant dark
     * do Shadcn funcionem corretamente.
     *
     * suppressHydrationWarning — necessário pois Next.js 
     * pode sinalizar diff de atributos de classe entre SSR e client.
     */
    <html
      lang="pt-BR"
      className={`${inter.variable} ${spaceGrotesk.variable} dark`}
      suppressHydrationWarning
    >
      {/*
       * Script inline de anti-flash (executa ANTES de qualquer CSS/JS ser processado).
       * Garante que mesmo com SSR o fundo já seja escuro no primeiro paint.
       */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.setAttribute('data-theme','dark');document.documentElement.style.backgroundColor='#090909';}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className="font-sans antialiased bg-background text-foreground min-h-dvh"
      >
        {children}
      </body>
    </html>
  )
}
