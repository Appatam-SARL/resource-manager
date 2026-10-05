import { Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { EnvironmentBanner } from '@/components/layout/environment-banner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import { readServerRuntimeConfig, serializeRuntimeConfig } from '@/lib/runtime-config';
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

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Render per request so deployment variables are read at runtime, never baked into the build.
  await connection();
  const runtimeConfig = readServerRuntimeConfig();

  return (
    <html
      lang="fr"
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
    >
      <head>
        <script
          id="rm-runtime-config"
          dangerouslySetInnerHTML={{ __html: serializeRuntimeConfig(runtimeConfig) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <EnvironmentBanner config={runtimeConfig} />
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
