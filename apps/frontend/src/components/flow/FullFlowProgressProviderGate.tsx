'use client';

import { FullFlowProgressProvider } from '@/contexts/FullFlowProgressContext';

export function FullFlowProgressProviderGate({ children }: { children: React.ReactNode }) {
  return <FullFlowProgressProvider>{children}</FullFlowProgressProvider>;
}
