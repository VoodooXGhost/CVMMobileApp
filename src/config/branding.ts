type Operator = 'neutral' | 'mtn' | 'tmcel';

const rawOperator = (process.env.EXPO_PUBLIC_OPERATOR || 'neutral').toLowerCase();
const operator: Operator = rawOperator === 'mtn' || rawOperator === 'tmcel' ? rawOperator : 'neutral';

const titles = {
  neutral: 'EngageHub',
  mtn: 'MTN Engage',
  tmcel: 'Tmcel Engage',
};

export const branding = {
  operator,
  appTitle: titles[operator],
  welcomePrefix: 'Welcome back',
  legalLine: '© 2026 EngageHub CVM Platform',
  supportDomain: operator === 'tmcel' ? 'tmcel.co.mz' : 'engagehub.app',
};
