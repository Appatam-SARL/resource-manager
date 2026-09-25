import { Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

const fontSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
});

const fontMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Resource Manager — Admin',
  description: 'Administration des ressources du Groupe',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="fr"
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <QueryProvider>
          <AuthProvider>
            <TooltipProvider>
              {children}
              <Toaster richColors position="top-right" closeButton />
            </TooltipProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
