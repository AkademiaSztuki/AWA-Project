import { useState, useEffect } from 'react';
import { SessionData, FlowStep } from '@/types';

interface UseSessionReturn {
  sessionData: SessionData;
  updateSession: (updates: Partial<SessionData>) => void;
  currentStep: FlowStep;
  setCurrentStep: (step: FlowStep) => void;
  userHash: string;
  isInitialized: boolean;
}

export const useSession = (): UseSessionReturn => {
  const [sessionData, setSessionData] = useState<SessionData>({
    userHash: '',
    consentTimestamp: '',
    currentStep: 'landing',
    tinderResults: [],
    visualDNA: {
      dominantTags: [],
      preferences: {
        colors: [],
        materials: [],
        styles: [],
        lighting: []
      },
      accuracyScore: 0
    },
    generations: [],
    finalSurvey: {
      satisfaction: { easeOfUse: 0, engagement: 0, clarity: 0, overall: 0 },
      agency: { control: 0, collaboration: 0, creativity: 0, ownership: 0 },
      preferences: { evolution: 0, crystallization: 0, discovery: 0 }
    }
  });

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Load from sessionStorage on mount
    const savedData = sessionStorage.getItem('aura_session');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setSessionData(parsed);
      } catch (error) {
        console.error('Failed to load session data:', error);
      }
    }

    // Generate user hash if not exists
    let userHash = sessionStorage.getItem('aura_user_hash');
    if (!userHash) {
      userHash = generateUserHash();
      sessionStorage.setItem('aura_user_hash', userHash);
    }

    setSessionData(prev => ({ ...prev, userHash }));
    setIsInitialized(true);
  }, []);

  const updateSession = (updates: Partial<SessionData>) => {
    setSessionData(prev => {
      const newData = { ...prev, ...updates };
      sessionStorage.setItem('aura_session', JSON.stringify(newData));
      return newData;
    });
  };

  const setCurrentStep = (step: FlowStep) => {
    updateSession({ currentStep: step });
  };

  return {
    sessionData,
    updateSession,
    currentStep: sessionData.currentStep,
    setCurrentStep,
    userHash: sessionData.userHash,
    isInitialized
  };
};

function generateUserHash(): string {
  return 'user_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}