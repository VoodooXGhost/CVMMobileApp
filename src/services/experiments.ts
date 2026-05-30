import { platformStorage } from './storage';

export interface ExperimentDefinition {
  key: string;
  variants: string[];
}

export interface ExperimentAssignment {
  key: string;
  variant: string;
}

const EXPERIMENTS: ExperimentDefinition[] = [
  { key: 'home_hero_cta_variant', variants: ['claim_now', 'unlock_offer'] },
  { key: 'marketplace_card_cta_variant', variants: ['hot_badge', 'deal_badge'] },
];

const ASSIGNMENTS_KEY = 'analytics_experiment_assignments_v1';

const hashValue = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const buildAssignments = (seed: string): Record<string, string> => {
  const assignments: Record<string, string> = {};
  for (const experiment of EXPERIMENTS) {
    const hash = hashValue(`${seed}:${experiment.key}`);
    const variant = experiment.variants[hash % experiment.variants.length];
    assignments[experiment.key] = variant;
  }
  return assignments;
};

export const getExperimentAssignments = async (seed: string) => {
  try {
    const cached = await platformStorage.getItemAsync(ASSIGNMENTS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.seed === seed && parsed?.assignments) {
        return parsed.assignments as Record<string, string>;
      }
    }
  } catch (_error) {}

  const assignments = buildAssignments(seed);
  await platformStorage.setItemAsync(
    ASSIGNMENTS_KEY,
    JSON.stringify({ seed, assignments }),
  );
  return assignments;
};
