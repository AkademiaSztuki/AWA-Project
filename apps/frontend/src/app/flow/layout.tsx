"use client";

import { usePathname } from 'next/navigation';
import { PartOneProgressBar } from '@/components/flow/PartOneProgressBar';
import { isPartOneFlowPath } from '@/lib/flow/part-one-flow';

export default function FlowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showProgress = isPartOneFlowPath(pathname);

  return (
    <div className="flex flex-col gap-8 p-4 lg:p-8">
      {showProgress && (
        <PartOneProgressBar currentPath={pathname} />
      )}
      <div>
        {children}
      </div>
    </div>
  );
}

