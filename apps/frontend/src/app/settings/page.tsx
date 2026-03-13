"use client";

import React from 'react';
import { AccountSettingsPanel } from '@/components/settings/AccountSettingsPanel';

export default function SettingsPage() {
  return (
    <div className="w-full max-w-3xl mx-auto py-6 sm:py-8">
      <AccountSettingsPanel />
    </div>
  );
}

