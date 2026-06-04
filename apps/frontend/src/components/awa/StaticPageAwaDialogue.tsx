'use client';

import React from 'react';
import { AwaDialogue } from '@/components/awa/AwaDialogue';

type StaticPageDialogueStep = 'about_project' | 'subscription_plans' | 'contact_page';

type StaticPageAwaDialogueProps = {
  currentStep: StaticPageDialogueStep;
};

/** Fixed bottom IDA line on static info pages (about, plans, contact). */
export function StaticPageAwaDialogue({ currentStep }: StaticPageAwaDialogueProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full pointer-events-none">
      <div className="pointer-events-auto">
        <AwaDialogue currentStep={currentStep} fullWidth autoStart autoHide />
      </div>
    </div>
  );
}
