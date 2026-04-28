import { Suspense } from 'react';
import { CoreProfileWizard } from '@/components/wizards/CoreProfileWizard';
import { HideDocumentScrollbar } from '@/components/ui/HideDocumentScrollbar';

export default function CoreProfilePage() {
  return (
    <>
      <HideDocumentScrollbar />
      <Suspense fallback={null}>
        <CoreProfileWizard />
      </Suspense>
    </>
  );
}

