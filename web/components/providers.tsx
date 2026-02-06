"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { LocationGuard } from "./location-guard";
import { GlobalProfile } from "./global-profile";
import { GlobalShortcuts } from "./global-shortcuts";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LocationGuard>
        {children}
        <GlobalProfile />
        <GlobalShortcuts />
      </LocationGuard>
    </QueryClientProvider>
  );
}
