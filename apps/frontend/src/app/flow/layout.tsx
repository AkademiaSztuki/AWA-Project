"use client";

import { usePathname } from 'next/navigation';
import { PartOneProgressBar } from '@/components/flow/PartOneProgressBar';
import { FLOW_PROGRESS_CONTENT_GAP } from '@/lib/flow/glass-step-layout';

export default function FlowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className={`flex flex-col ${FLOW_PROGRESS_CONTENT_GAP} p-3 sm:p-4 lg:p-8`}>
      <PartOneProgressBar currentPath={pathname} />
      <div>
        {children}
      </div>
    </div>
  );
}
