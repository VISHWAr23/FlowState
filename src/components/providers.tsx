'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { ToastProvider } from '@/components/toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30s fresh window makes route switches instant while Realtime handles live updates
        gcTime: 1000 * 60 * 60, // 1 hour garbage collection
        refetchOnWindowFocus: true, // Auto-refetch when user switches between laptop/mobile tabs
        refetchOnReconnect: true, // Auto-refetch when reconnecting to network
        refetchOnMount: true,
        retry: 1,
        networkMode: 'always',
      },
      mutations: {
        retry: 0,
        networkMode: 'always',
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
        <ToastProvider />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
