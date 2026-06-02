import { FREE_PLAN_CREDITS } from '@/lib/stripe';

export interface FoundersProgramStatus {
  max: number;
  claimed: number;
  remaining: number;
  open: boolean;
}

const DEFAULT_STATUS: FoundersProgramStatus = {
  max: 1000,
  claimed: 0,
  remaining: 1000,
  open: true,
};

export async function fetchFoundersProgramStatus(): Promise<FoundersProgramStatus> {
  try {
    const res = await fetch('/api/credits/founders-status', { cache: 'no-store' });
    if (!res.ok) return DEFAULT_STATUS;
    const data = (await res.json()) as FoundersProgramStatus;
    return {
      max: data.max ?? DEFAULT_STATUS.max,
      claimed: data.claimed ?? 0,
      remaining: data.remaining ?? 0,
      open: data.open ?? false,
    };
  } catch {
    return DEFAULT_STATUS;
  }
}

export { FREE_PLAN_CREDITS as FOUNDERS_GRANT_CREDITS_DISPLAY };
