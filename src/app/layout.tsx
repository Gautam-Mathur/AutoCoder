import type { Metadata } from 'next';
import { AppProvider } from '@/context/AppContext';
import Sidebar from '@/components/Sidebar';
import TopAppBar from '@/components/TopAppBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Autocoder AI - RuFlo Multi-Agent Specification Compiler',
  description: 'Synthesize, validate, repair, and optimize full-stack web applications from natural language prompts.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap"
        />
      </head>
      <body className="bg-slate-950 text-on-surface h-screen overflow-hidden flex flex-col antialiased" suppressHydrationWarning>
        <AppProvider>
          <div className="flex flex-col h-screen overflow-hidden">
            <TopAppBar />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              {children}
            </div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
