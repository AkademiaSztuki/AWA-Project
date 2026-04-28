"use client";

import { usePathname } from 'next/navigation';
import { PartOneProgressBar } from '@/components/flow/PartOneProgressBar';

export default function FlowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-2 sm:gap-4 p-3 sm:p-4 lg:p-8">
      <PartOneProgressBar currentPath={pathname} />
      <div>
        {children}
      </div>
    </div>
  );
}
