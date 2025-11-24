"use client";

import { usePathname } from 'next/navigation';
import { PartOneProgressBar } from '@/components/flow/PartOneProgressBar';
import { isPartOneFlowPath } from '@/lib/flow/part-one-flow';

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showProgress = isPartOneFlowPath(pathname);

  return (
    <>
      {showProgress && <PartOneProgressBar currentPath={pathname} />}
      <div className={showProgress ? 'pt-32' : ''}>
        {children}
      </div>
    </>
  );
}

