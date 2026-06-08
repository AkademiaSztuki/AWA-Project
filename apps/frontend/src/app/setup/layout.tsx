"use client";

import { usePathname } from 'next/navigation';
import { PartOneProgressBar } from '@/components/flow/PartOneProgressBar';
import { FLOW_PROGRESS_CONTENT_GAP } from '@/lib/flow/glass-step-layout';
import { isFullFlowJourneyPath } from '@/lib/flow/full-flow-progress';

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showProgress = isFullFlowJourneyPath(pathname);

  return (
    <div className={`flex flex-col ${FLOW_PROGRESS_CONTENT_GAP} p-3 sm:p-4 lg:p-8`}>
      {showProgress && (
        <div className="px-2 sm:px-3">
          <PartOneProgressBar currentPath={pathname} />
        </div>
      )}
      <div className="min-w-0 px-2 sm:px-3">
        {children}
      </div>
    </div>
  );
}

