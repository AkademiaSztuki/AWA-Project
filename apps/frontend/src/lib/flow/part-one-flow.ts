export type PartOneStepKey = 'core_profile' | 'inspirations' | 'big_five';

export interface PartOneFlowStep {
  key: PartOneStepKey;
  path: string;
  title: { pl: string; en: string };
  description: { pl: string; en: string };
}

export const PART_ONE_FLOW_STEPS: PartOneFlowStep[] = [
  {
    key: 'core_profile',
    path: '/setup/profile',
    title: { pl: 'Core Profile', en: 'Core Profile' },
    description: {
      pl: 'Poznajemy Twoje potrzeby, rutyny i ulubione bodźce.',
      en: 'Capturing your needs, rituals and preferred stimuli.',
    },
  },
  {
    key: 'inspirations',
    path: '/flow/inspirations',
    title: { pl: 'Inspiracje', en: 'Inspirations' },
    description: {
      pl: 'Kuratowane referencje i moodboardy.',
      en: 'Curated references and moodboards.',
    },
  },
  {
    key: 'big_five',
    path: '/flow/big-five',
    title: { pl: 'Big Five', en: 'Big Five' },
    description: {
      pl: 'Psychologiczny baseline wspierający projektowanie.',
      en: 'Psychological baseline for design decisions.',
    },
  },
];

export const PART_ONE_TOTAL_STEPS = PART_ONE_FLOW_STEPS.length;

type StepMap = Record<string, (PartOneFlowStep & { index: number })>;

const PART_ONE_STEP_MAP: StepMap = PART_ONE_FLOW_STEPS.reduce<StepMap>((acc, step, index) => {
  acc[step.path] = { ...step, index };
  return acc;
}, {});

export function getPartOneStepInfo(pathname: string) {
  return PART_ONE_STEP_MAP[pathname] || null;
}

export function isPartOneFlowPath(pathname: string) {
  return Boolean(getPartOneStepInfo(pathname));
}

