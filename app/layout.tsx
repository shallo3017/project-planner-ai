import type { Metadata } from 'next';
import { Manrope, Outfit } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

// Body/UI — semi-geometric with open counters: crisp at small sizes, warmer than
// a system stack, without reading as trendy.
const sans = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

// Headings — geometric, with real presence at bold weights (echoes the brand's
// heavy display type).
const display = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RoadmapAI — Requirements to PRD & TRD',
  description:
    'An AI platform that turns project requirements into professional PRD and TRD documents.',
};

// This is an auth-gated, client-rendered app — render every route on demand
// instead of trying to statically prerender pages that depend on client context.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint to avoid a light flash on load. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
